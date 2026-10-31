// useReactions — emoji reactions for messages
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: Array<{
    user_id: string;
    username: string;
  }>;
  hasReacted: boolean;
}

export function useReactions(groupId: string | null, messageIds: string[]) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchReactions = useCallback(async () => {
    if (!groupId || messageIds.length === 0) return;

    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds);

    if (error) {
      console.error("Failed to fetch reactions:", error);
      return;
    }

    // Fetch profiles for reaction users
    const userIds = [...new Set(data?.map((r) => r.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, username, avatar_url")
      .in("user_id", userIds);

    const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
    profiles?.forEach((p) => {
      profileMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
    });

    // Group reactions by message_id
    const grouped: Record<string, Reaction[]> = {};
    data?.forEach((reaction) => {
      if (!grouped[reaction.message_id]) {
        grouped[reaction.message_id] = [];
      }
      grouped[reaction.message_id].push({
        ...reaction,
        profile: profileMap[reaction.user_id],
      });
    });

    setReactions(grouped);
  }, [groupId, messageIds]);

  useEffect(() => {
    if (!groupId || messageIds.length === 0) {
      setReactions({});
      return;
    }

    fetchReactions();

    // Set up realtime subscription
    const channel = supabase
      .channel(`reactions:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, messageIds.join(","), fetchReactions]);

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });

    if (error) {
      if (error.code === "23505") {
        // Duplicate - remove reaction instead
        await removeReaction(messageId, emoji);
      } else {
        toast.error("Failed to add reaction");
      }
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);

    if (error) {
      toast.error("Failed to remove reaction");
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const messageReactions = reactions[messageId] || [];
    const existingReaction = messageReactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  const getReactionGroups = (messageId: string): ReactionGroup[] => {
    const messageReactions = reactions[messageId] || [];
    const groups: Record<string, ReactionGroup> = {};

    messageReactions.forEach((reaction) => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 0,
          users: [],
          hasReacted: false,
        };
      }
      groups[reaction.emoji].count++;
      groups[reaction.emoji].users.push({
        user_id: reaction.user_id,
        username: reaction.profile?.username || "Unknown",
      });
      if (reaction.user_id === user?.id) {
        groups[reaction.emoji].hasReacted = true;
      }
    });

    return Object.values(groups).sort((a, b) => b.count - a.count);
  };

  return {
    reactions,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionGroups,
    refetch: fetchReactions,
  };
}
