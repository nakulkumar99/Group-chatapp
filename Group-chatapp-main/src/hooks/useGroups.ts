import { useState, useEffect, useCallback } from "react";
import { supabase, FUNCTIONS_BASE_URL } from "@/integrations/supabase/client";
import { getNetworkErrorMessage, parseFunctionResponse } from "@/lib/functionErrors";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const FUNCTION_TIMEOUT_MS = 20_000;

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
  has_password?: boolean;
  user_role?: "admin" | "moderator" | "member" | null;
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

    // Member rows are private, so counts come from a safe aggregate that only
    // returns group ids and totals (never the member identities).
    const { data: memberCounts } = await supabase.rpc("get_group_member_counts");

    const countMap: Record<string, number> = {};
    (memberCounts || []).forEach((m) => {
      countMap[m.group_id] = Number(m.member_count);
    });

    // The current user's role is needed to decide who may reset a group
    // password without exposing anyone else's roles.
    const { data: myRoleRows } = await supabase
      .from("user_roles")
      .select("group_id, role")
      .eq("user_id", user.id);

    const roleMap = new Map<string, Group["user_role"]>(
      (myRoleRows || []).map((r) => [r.group_id, r.role as Group["user_role"]])
    );

    const enrichedGroups = (allGroups || []).map((group: any) => ({
      ...group,
      member_count: countMap[group.id] || 0,
      is_member: memberGroupIds.has(group.id),
      has_password: !!group.has_password,
      user_role: roleMap.get(group.id) || null,
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

    // Store hashed password via edge function. If this fails, delete the new
    // group instead of leaving it locked with no usable password.
    if (password) {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FUNCTION_TIMEOUT_MS);

      try {
        const response = await fetch(
          `${FUNCTIONS_BASE_URL}/set-group-password`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                    "x-supabase-authorization": `Bearer ${token}`,
                  }
                : {}),
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ group_id: data.id, password }),
            signal: controller.signal,
          }
        );

        const { error: passwordError } = await parseFunctionResponse(response);
        if (passwordError) {
          await supabase
            .from("groups")
            .delete()
            .eq("id", data.id)
            .eq("created_by", user.id);
          toast.error(`Failed to set group password: ${passwordError.message}`);
          return { error: passwordError };
        }
      } catch (err) {
        const message = getNetworkErrorMessage(err);
        await supabase
          .from("groups")
          .delete()
          .eq("id", data.id)
          .eq("created_by", user.id);
        toast.error(`Failed to set group password: ${message}`);
        return { error: new Error(message) };
      } finally {
        clearTimeout(timeout);
      }
    }

    // Auto-join the group
    const { error: autoJoinError } = await supabase
      .from("group_members")
      .insert({ group_id: data.id, user_id: user.id });

    if (autoJoinError) {
      toast.error("Group created, but you could not be added as a member");
      return { data, error: autoJoinError };
    }

    toast.success("Group created!");
    await fetchGroups();
    return { data, error: null };
  };

  const joinGroup = async (groupId: string, password?: string) => {
    if (!user) {
      const message = "Your session has expired. Please sign in again.";
      toast.error(message);
      return { error: new Error(message) };
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      const message = "Your session has expired. Please sign in again.";
      toast.error(message);
      return { error: new Error(message) };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FUNCTION_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/join-group-with-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "x-supabase-authorization": `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ group_id: groupId, password }),
          signal: controller.signal,
        }
      );

      // Read the body once and handle non-JSON gateway/proxy responses
      // without turning them into an unhandled "Network Error".
      const { error } = await parseFunctionResponse(response);

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success("Joined group!");
      await fetchGroups();
      return { error: null };
    } catch (err) {
      const message = getNetworkErrorMessage(err);
      toast.error(message);
      return { error: new Error(message) };
    } finally {
      clearTimeout(timeout);
    }
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
