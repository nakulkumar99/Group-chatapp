import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  created_at: string;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  groups?: {
    name: string;
  };
}

export function useAdminMessages() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(
    async (
      page: number = 0,
      pageSize: number = 20,
      search?: string,
      groupId?: string
    ) => {
      setLoading(true);

      try {
        let query = supabase
          .from("messages")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (search) {
          query = query.ilike("content", `%${search}%`);
        }

        if (groupId) {
          query = query.eq("group_id", groupId);
        }

        const { data: messages, count, error } = await query;

        if (error) throw error;

        if (!messages || messages.length === 0) {
          return { messages: [], total: 0 };
        }

        // Fetch profiles and groups separately
        const userIds = [...new Set(messages.map((m) => m.user_id))];
        const groupIds = [...new Set(messages.map((m) => m.group_id))];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", userIds);

        const { data: groups } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { username: p.username, avatar_url: p.avatar_url }])
        );
        const groupMap = new Map(groups?.map((g) => [g.id, { name: g.name }]));

        const messagesWithDetails: Message[] = messages.map((msg) => ({
          ...msg,
          profiles: profileMap.get(msg.user_id),
          groups: groupMap.get(msg.group_id),
        }));

        return { messages: messagesWithDetails, total: count || 0 };
      } catch (error) {
        console.error("Error fetching messages:", error);
        return { messages: [], total: 0 };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        // First get message details for audit log
        const { data: message } = await supabase
          .from("messages")
          .select("content, user_id, group_id")
          .eq("id", messageId)
          .single();

        const { error } = await supabase
          .from("messages")
          .delete()
          .eq("id", messageId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "delete_message",
          target_type: "message",
          target_id: messageId,
          details: message ? { content_preview: message.content.slice(0, 100) } : {},
        });

        return { error: null };
      } catch (error) {
        console.error("Error deleting message:", error);
        return { error };
      }
    },
    [user]
  );

  const deleteMessages = useCallback(
    async (messageIds: string[]) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        const { error } = await supabase
          .from("messages")
          .delete()
          .in("id", messageIds);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "bulk_delete_messages",
          target_type: "message",
          target_id: null,
          details: { count: messageIds.length, message_ids: messageIds },
        });

        return { error: null };
      } catch (error) {
        console.error("Error deleting messages:", error);
        return { error };
      }
    },
    [user]
  );

  return {
    fetchMessages,
    deleteMessage,
    deleteMessages,
    loading,
  };
}
