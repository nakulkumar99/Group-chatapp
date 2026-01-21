import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface GroupMember {
  id: string;
  user_id: string;
  joined_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useGroupMembers(groupId: string | null) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);

    if (error) {
      toast.error("Failed to fetch members");
      setLoading(false);
      return;
    }

    // Fetch profiles
    const userIds = data?.map((m) => m.user_id) || [];
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

    const enrichedMembers = (data || []).map((member) => ({
      ...member,
      profile: profileMap[member.user_id],
    }));

    setMembers(enrichedMembers);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    fetchMembers();

    // Set up realtime subscription for member changes
    const channel = supabase
      .channel(`members:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [groupId, fetchMembers]);

  return {
    members,
    loading,
    refetch: fetchMembers,
  };
}
