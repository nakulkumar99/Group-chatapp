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
  has_password?: boolean;
}

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Fetch all groups (password column is not exposed to client via select *)
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

    const enrichedGroups = (allGroups || []).map((group: any) => ({
      ...group,
      member_count: countMap[group.id] || 0,
      is_member: memberGroupIds.has(group.id),
      has_password: !!group.has_password,
    }));

    setGroups(enrichedGroups);
    setMyGroups(enrichedGroups.filter((g) => g.is_member));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (name: string, description?: string, password?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const insertData: any = { name, description, created_by: user.id, has_password: !!password };

    const { data, error } = await supabase
      .from("groups")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create group");
      return { error };
    }

    // Store password in separate secure table if provided
    if (password) {
      await supabase
        .from("group_passwords")
        .insert({ group_id: data.id, password });
    }

    // Auto-join the group
    await supabase
      .from("group_members")
      .insert({ group_id: data.id, user_id: user.id });

    toast.success("Group created!");
    await fetchGroups();
    return { data, error: null };
  };

  const joinGroup = async (groupId: string, password?: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Use edge function for password-protected joining
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/join-group-with-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ group_id: groupId, password }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 403) {
        toast.error("Incorrect password");
      } else if (response.status === 409) {
        toast.error("You're already a member of this group");
      } else {
        toast.error(result.error || "Failed to join group");
      }
      return { error: new Error(result.error) };
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

  const deleteGroup = async (groupId: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("created_by", user.id);

    if (error) {
      toast.error("Failed to delete group");
      return { error };
    }

    toast.success("Group deleted");
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
    deleteGroup,
    refetch: fetchGroups,
  };
}
