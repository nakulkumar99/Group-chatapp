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
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useMessages(groupId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
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

  return {
    messages,
    loading,
    sendMessage,
    refetch: fetchMessages,
  };
}
