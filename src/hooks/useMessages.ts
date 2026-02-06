import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Message {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  file_url?: string | null;
  file_type?: string | null;
  file_name?: string | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_for_everyone?: boolean;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useMessages(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedForMeIds, setDeletedForMeIds] = useState<Set<string>>(new Set());
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!groupId || !user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Failed to fetch messages");
      setLoading(false);
      return;
    }

    // Fetch profiles for all messages
    const userIds = [...new Set(data?.map((m) => m.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", userIds);

    const profileMap: Record<
      string,
      { username: string; avatar_url: string | null }
    > = {};
    profiles?.forEach((p) => {
      profileMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
    });

    const enrichedMessages = (data || []).map((msg) => ({
      ...msg,
      profile: profileMap[msg.user_id],
    }));

    setMessages(enrichedMessages);
    setLoading(false);
  }, [groupId, user]);

  useEffect(() => {
    if (!groupId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    // Set up realtime subscription
    const channel = supabase
      .channel(`messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Fetch profile for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", newMessage.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMessage, profile: profile || undefined },
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id
                ? { ...msg, ...updatedMessage }
                : msg
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, user, fetchMessages]);

  const sendMessage = async (
    content: string,
    fileUrl?: string,
    fileType?: string,
    fileName?: string
  ) => {
    if (!groupId || !user) return { error: new Error("Not authenticated") };

    const { error } = await supabase.from("messages").insert({
      group_id: groupId,
      user_id: user.id,
      content: content || "",
      file_url: fileUrl || null,
      file_type: fileType || null,
      file_name: fileName || null,
    });

    if (error) {
      toast.error("Failed to send message");
      return { error };
    }

    return { error: null };
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("messages")
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to edit message");
      return;
    }

    // Update local state
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: newContent, edited_at: new Date().toISOString() }
          : msg
      )
    );
  };

  const deleteForMe = (messageId: string) => {
    setDeletedForMeIds((prev) => new Set(prev).add(messageId));
    toast.success("Message deleted for you");
  };

  const deleteForEveryone = async (messageId: string) => {
    if (!user) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // Check 5-minute window
    const fiveMinutesMs = 5 * 60 * 1000;
    const messageTime = new Date(message.created_at).getTime();
    const now = Date.now();

    if (now - messageTime > fiveMinutesMs) {
      toast.error("You can only delete for everyone within 5 minutes");
      return;
    }

    const { error } = await supabase
      .from("messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_for_everyone: true,
      })
      .eq("id", messageId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to delete message");
      return;
    }

    toast.success("Message deleted for everyone");
  };

  const canDeleteForEveryone = (createdAt: string): boolean => {
    const fiveMinutesMs = 5 * 60 * 1000;
    const messageTime = new Date(createdAt).getTime();
    const now = Date.now();
    return now - messageTime <= fiveMinutesMs;
  };

  // Filter out messages deleted for current user
  const visibleMessages = messages.filter(
    (msg) => !deletedForMeIds.has(msg.id)
  );

  return {
    messages: visibleMessages,
    loading,
    sendMessage,
    editMessage,
    deleteForMe,
    deleteForEveryone,
    canDeleteForEveryone,
    refetch: fetchMessages,
  };
}
