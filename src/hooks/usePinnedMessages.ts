import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface PinnedMessage {
  id: string;
  group_id: string;
  message_id: string;
  pinned_by: string;
  pinned_at: string;
  message?: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profile?: {
      username: string;
      avatar_url: string | null;
    };
  };
}

export function usePinnedMessages(groupId: string | null) {
  const { user } = useAuth();
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchPinnedMessages = useCallback(async () => {
    if (!groupId) {
      setPinnedMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("pinned_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("pinned_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch pinned messages:", error);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      // Fetch the actual messages
      const messageIds = data.map((pm) => pm.message_id);
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .in("id", messageIds);

      // Fetch profiles for message authors
      const userIds = [...new Set(messages?.map((m) => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
      });

      const messageMap: Record<string, PinnedMessage["message"]> = {};
      messages?.forEach((m) => {
        messageMap[m.id] = {
          ...m,
          profile: profileMap[m.user_id],
        };
      });

      setPinnedMessages(
        data.map((pm) => ({
          ...pm,
          message: messageMap[pm.message_id],
        }))
      );
    } else {
      setPinnedMessages([]);
    }

    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      setPinnedMessages([]);
      setLoading(false);
      return;
    }

    fetchPinnedMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel(`pinned:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pinned_messages",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchPinnedMessages();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, fetchPinnedMessages]);

  const pinMessage = async (messageId: string) => {
    if (!groupId || !user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("pinned_messages").insert({
      group_id: groupId,
      message_id: messageId,
      pinned_by: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Message already pinned");
      } else {
        toast.error("Failed to pin message");
      }
      return { error };
    }

    toast.success("Message pinned");
    return { error: null };
  };

  const unpinMessage = async (messageId: string) => {
    if (!groupId || !user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("pinned_messages")
      .delete()
      .eq("group_id", groupId)
      .eq("message_id", messageId);

    if (error) {
      toast.error("Failed to unpin message");
      return { error };
    }

    toast.success("Message unpinned");
    return { error: null };
  };

  const isMessagePinned = (messageId: string): boolean => {
    return pinnedMessages.some((pm) => pm.message_id === messageId);
  };

  return {
    pinnedMessages,
    loading,
    pinMessage,
    unpinMessage,
    isMessagePinned,
    refetch: fetchPinnedMessages,
  };
}
