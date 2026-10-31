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
  const readReceiptsRef = useRef(readReceipts);
  const messageIdsRef = useRef(messageIds);

  readReceiptsRef.current = readReceipts;
  messageIdsRef.current = messageIds;

  const fetchReadReceipts = useCallback(async () => {
    const ids = messageIdsRef.current;
    if (!groupId || ids.length === 0) {
      setReadReceipts({});
      setLoading(false);
      return;
    }

    const { data: receipts, error } = await supabase
      .from("message_reads")
      .select("*")
      .in("message_id", ids);

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

    const userIds = [...new Set(receipts.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

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
  }, [groupId]);

  const markAsRead = useCallback(
    async (messageId: string) => {
      if (!user || !messageId) return;

      const existingReceipts = readReceiptsRef.current[messageId] || [];
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
    [user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user || messageIdsRef.current.length === 0) return;

    const currentReceipts = readReceiptsRef.current;
    const unreadMessageIds = messageIdsRef.current.filter((msgId) => {
      const receipts = currentReceipts[msgId] || [];
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
  }, [user]);

  useEffect(() => {
    fetchReadReceipts();
  }, [groupId, messageIds.join(","), fetchReadReceipts]);

  useEffect(() => {
    if (!groupId) return;

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

          if (!messageIdsRef.current.includes(newReceipt.message_id)) return;

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
  }, [groupId]);

  return {
    readReceipts,
    loading,
    markAsRead,
    markAllAsRead,
    refetch: fetchReadReceipts,
  };
}
