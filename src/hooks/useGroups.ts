import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Fetch all groups
    const { data: allGroups, error: groupsError } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (groupsError) {
      toast.error("Failed to fetch groups");
      setLoading(false);
      return;
    }

    // Fetch user's memberships
    const { data: memberships, error: memberError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (memberError) {
      toast.error("Failed to fetch memberships");
      setLoading(false);
      return;
    }

    const memberGroupIds = new Set(memberships?.map((m) => m.group_id) || []);

    // Get member counts for each group
    const { data: memberCounts } = await supabase
      .from("group_members")
      .select("group_id");

    const countMap: Record<string, number> = {};
    memberCounts?.forEach((m) => {
      countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
    });

    const enrichedGroups = (allGroups || []).map((group) => ({
      ...group,
      member_count: countMap[group.id] || 0,
      is_member: memberGroupIds.has(group.id),
    }));

    setGroups(enrichedGroups);
    setMyGroups(enrichedGroups.filter((g) => g.is_member));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, description?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { data, error } = await supabase
      .from("groups")
      .insert({ name, description, created_by: user.id })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create group");
      return { error };
    }

    // Auto-join the group
    await supabase
      .from("group_members")
      .insert({ group_id: data.id, user_id: user.id });

    toast.success("Group created!");
    await fetchGroups();
    return { data, error: null };
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: user.id });

    if (error) {
      if (error.code === "23505") {
        toast.error("You're already a member of this group");
      } else {
        toast.error("Failed to join group");
      }
      return { error };
    }

    toast.success("Joined group!");
    await fetchGroups();
    return { error: null };
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Failed to leave group");
      return { error };
    }

    toast.success("Left group");
    await fetchGroups();
    return { error: null };
  };

  return {
    groups,
    myGroups,
    loading,
    createGroup,
    joinGroup,
    leaveGroup,
    refetch: fetchGroups,
  };
}
