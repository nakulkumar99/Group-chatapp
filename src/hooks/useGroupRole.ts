import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "member";

interface UserRole {
  id: string;
  user_id: string;
  group_id: string;
  role: AppRole;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface GroupSettings {
  only_admins_can_send: boolean;
  only_admins_can_add_members: boolean;
}

export function useGroupRole(groupId: string | null) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [groupRoles, setGroupRoles] = useState<UserRole[]>([]);
  const [groupSettings, setGroupSettings] = useState<GroupSettings>({
    only_admins_can_send: false,
    only_admins_can_add_members: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchRoleData = useCallback(async () => {
    if (!groupId || !user) {
      setUserRole(null);
      setIsAdmin(false);
      setIsCreator(false);
      setGroupRoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch group info to check if user is creator
    const { data: group } = await supabase
      .from("groups")
      .select("created_by, settings")
      .eq("id", groupId)
      .single();

    const isGroupCreator = group?.created_by === user.id;
    setIsCreator(isGroupCreator);

    if (group?.settings && typeof group.settings === 'object' && group.settings !== null) {
      const settings = group.settings as Record<string, unknown>;
      setGroupSettings({
        only_admins_can_send: Boolean(settings.only_admins_can_send),
        only_admins_can_add_members: Boolean(settings.only_admins_can_add_members),
      });
    }

    // Fetch user's role in the group
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", user.id)
      .single();

    const role = roleData?.role as AppRole | null;
    setUserRole(role);
    setIsAdmin(isGroupCreator || role === "admin");

    // Fetch all roles in the group
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("group_id", groupId);

    if (allRoles) {
      const userIds = allRoles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, { username: string; avatar_url: string | null }> = {};
      profiles?.forEach((p) => {
        profileMap[p.user_id] = { username: p.username, avatar_url: p.avatar_url };
      });

      setGroupRoles(
        allRoles.map((r) => ({
          ...r,
          role: r.role as AppRole,
          profile: profileMap[r.user_id],
        }))
      );
    }

    setLoading(false);
  }, [groupId, user]);

  useEffect(() => {
    fetchRoleData();
  }, [fetchRoleData]);

  const setRole = async (targetUserId: string, role: AppRole) => {
    if (!groupId || !user || !isAdmin) {
      toast.error("Only admins can perform this action");
      return { error: new Error("Permission denied") };
    }

    // Check if role already exists
    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", targetUserId)
      .single();

    if (existing) {
      // Update existing role
      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("id", existing.id);

      if (error) {
        toast.error("Failed to update role");
        return { error };
      }
    } else {
      // Insert new role
      const { error } = await supabase.from("user_roles").insert({
        group_id: groupId,
        user_id: targetUserId,
        role,
      });

      if (error) {
        toast.error("Failed to assign role");
        return { error };
      }
    }

    await fetchRoleData();
    toast.success(`Role updated to ${role}`);
    return { error: null };
  };

  // Server-side validated role update via edge function
  const updateRoleViaAPI = async (targetUserId: string, newRole: AppRole) => {
    if (!groupId || !user) {
      toast.error("Only admins can perform this action");
      return { error: new Error("Permission denied") };
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        toast.error("Authentication required");
        return { error: new Error("No session") };
      }

      const { data, error } = await supabase.functions.invoke("update-member-role", {
        body: { groupId, targetUserId, newRole },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error(error.message || "Failed to update role");
        return { error };
      }

      if (data?.error) {
        toast.error(data.error);
        return { error: new Error(data.error) };
      }

      await fetchRoleData();
      toast.success(`Role updated to ${newRole}`);
      return { error: null };
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to update role. Please try again.");
      return { error: err as Error };
    }
  };

  const removeRole = async (targetUserId: string) => {
    if (!groupId || !user || !isAdmin) {
      toast.error("Only admins can perform this action");
      return { error: new Error("Permission denied") };
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", targetUserId);

    if (error) {
      toast.error("Failed to remove role");
      return { error };
    }

    await fetchRoleData();
    toast.success("Role removed");
    return { error: null };
  };

  const updateSettings = async (settings: Partial<GroupSettings>) => {
    if (!groupId || !user) {
      toast.error("Only admins can perform this action");
      return { error: new Error("Permission denied") };
    }

    try {
      const { data, error } = await supabase.functions.invoke("update-group-settings", {
        body: { groupId, settings },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast.error(error.message || "Failed to update settings");
        return { error };
      }

      if (data?.error) {
        toast.error(data.error);
        return { error: new Error(data.error) };
      }

      // Update local state with the returned settings
      if (data?.settings) {
        setGroupSettings({
          only_admins_can_send: Boolean(data.settings.only_admins_can_send),
          only_admins_can_add_members: Boolean(data.settings.only_admins_can_add_members),
        });
      } else {
        setGroupSettings({ ...groupSettings, ...settings });
      }
      
      toast.success("Settings updated");
      return { error: null };
    } catch (err) {
      console.error("API error:", err);
      toast.error("Failed to update settings. Please try again.");
      return { error: err as Error };
    }
  };

  // Permission checks based on group settings
  const canSendMessages = groupSettings.only_admins_can_send ? isAdmin : true;
  const canAddMembers = groupSettings.only_admins_can_add_members ? isAdmin : true;

  return {
    userRole,
    isAdmin,
    isCreator,
    groupRoles,
    groupSettings,
    loading,
    setRole,
    updateRoleViaAPI,
    removeRole,
    updateSettings,
    canSendMessages,
    canAddMembers,
    refetch: fetchRoleData,
  };
}
