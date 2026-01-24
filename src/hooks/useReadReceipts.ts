import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ReadReceipt {
  id: string;
  message_id: string;
  user_id: string;
  read_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useReadReceipts(groupId: string | null, messageIds: string[]) {
  const { user } = useAuth();
  const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt[]>>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchReadReceipts = useCallback(async () => {
    if (!groupId || messageIds.length === 0) {
      setReadReceipts({});
      setLoading(false);
      return;
    }

    const { data: receipts, error } = await supabase
      .from("message_reads")
      .select("*")
      .in("message_id", messageIds);

    if (error) {
      console.error("Error fetching read receipts:", error);
      setLoading(false);
      return;
    }

    if (!receipts || receipts.length === 0) {
      setReadReceipts({});
      setLoading(false);
      return;
    }

    // Fetch profiles for all unique user_ids
    const userIds = [...new Set(receipts.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Group receipts by message_id
    const grouped: Record<string, ReadReceipt[]> = {};
    receipts.forEach((receipt) => {
      const profile = profileMap.get(receipt.user_id);
      const enrichedReceipt = {
        ...receipt,
        profile: profile
          ? { username: profile.username, avatar_url: profile.avatar_url }
          : undefined,
      };

      if (!grouped[receipt.message_id]) {
        grouped[receipt.message_id] = [];
      }
      grouped[receipt.message_id].push(enrichedReceipt);
    });

    setReadReceipts(grouped);
    setLoading(false);
  }, [groupId, messageIds]);

  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!user || !messageId) return;

      // Check if already read
      const existingReceipts = readReceipts[messageId] || [];
      if (existingReceipts.some((r) => r.user_id === user.id)) {
        return;
      }

      const { error } = await supabase.from("message_reads").insert({
        message_id: messageId,
        user_id: user.id,
      });

      if (error && !error.message.includes("duplicate")) {
        console.error("Error marking message as read:", error);
      }
    },
    [user, readReceipts]
  );

  // Mark all messages as read
  const markAllAsRead = useCallback(async () => {
    if (!user || messageIds.length === 0) return;

    // Filter messages not yet read by current user
    const unreadMessageIds = messageIds.filter((msgId) => {
      const receipts = readReceipts[msgId] || [];
      return !receipts.some((r) => r.user_id === user.id);
    });

    if (unreadMessageIds.length === 0) return;

    const inserts = unreadMessageIds.map((message_id) => ({
      message_id,
      user_id: user.id,
    }));

    const { error } = await supabase.from("message_reads").insert(inserts);

    if (error && !error.message.includes("duplicate")) {
      console.error("Error marking messages as read:", error);
    }
  }, [user, messageIds, readReceipts]);

  useEffect(() => {
    fetchReadReceipts();
  }, [fetchReadReceipts]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!groupId || messageIds.length === 0) return;

    channelRef.current = supabase
      .channel(`read-receipts:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reads",
        },
        async (payload) => {
          const newReceipt = payload.new as ReadReceipt;

          // Only process if it's for one of our messages
          if (!messageIds.includes(newReceipt.message_id)) return;

          // Fetch profile for this user
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", newReceipt.user_id)
            .single();

          const enrichedReceipt = {
            ...newReceipt,
            profile: profile || undefined,
          };

          setReadReceipts((prev) => {
            const existing = prev[newReceipt.message_id] || [];
            // Avoid duplicates
            if (existing.some((r) => r.user_id === newReceipt.user_id)) {
              return prev;
            }
            return {
              ...prev,
              [newReceipt.message_id]: [...existing, enrichedReceipt],
            };
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, messageIds]);

  return {
    readReceipts,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchReadReceipts,
  };
}
