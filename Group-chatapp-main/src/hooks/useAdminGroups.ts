import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

interface GroupSettings {
  only_admins_can_send?: boolean;
  only_admins_can_add_members?: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  settings: GroupSettings | null;
  created_at: string;
  member_count?: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  joined_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  user_roles?: {
    role: string;
  }[];
}

export function useAdminGroups() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchGroups = useCallback(async (search?: string) => {
    setLoading(true);

    try {
      let query = supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data: groups, error } = await query;

      if (error) throw error;

      // Get member counts
      const groupsWithCounts = await Promise.all(
        (groups || []).map(async (group) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            ...group,
            settings: group.settings as GroupSettings | null,
            member_count: count || 0,
          };
        })
      );

      return { groups: groupsWithCounts as Group[] };
    } catch (error) {
      console.error("Error fetching groups:", error);
      return { groups: [] };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchGroupMembers = useCallback(async (groupId: string) => {
    try {
      const { data: members, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", groupId);

      if (error) throw error;

      if (!members || members.length === 0) {
        return { members: [] };
      }

      const userIds = members.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", userIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("group_id", groupId)
        .in("user_id", userIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { username: p.username, avatar_url: p.avatar_url }])
      );
      const roleMap = new Map(roles?.map((r) => [r.user_id, [{ role: r.role }]]));

      const membersWithDetails: GroupMember[] = members.map((member) => ({
        ...member,
        profiles: profileMap.get(member.user_id),
        user_roles: roleMap.get(member.user_id),
      }));

      return { members: membersWithDetails };
    } catch (error) {
      console.error("Error fetching group members:", error);
      return { members: [] };
    }
  }, []);

  const updateGroupSettings = useCallback(
    async (groupId: string, settings: GroupSettings) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        const { error } = await supabase
          .from("groups")
          .update({ settings: settings as Json })
          .eq("id", groupId);

        if (error) throw error;

        await supabase.from("audit_logs").insert([{
          admin_id: user.id,
          action: "update_group_settings",
          target_type: "group",
          target_id: groupId,
          details: settings as Json,
        }]);

        return { error: null };
      } catch (error) {
        console.error("Error updating group settings:", error);
        return { error };
      }
    },
    [user]
  );

  const removeMember = useCallback(
    async (groupId: string, userId: string) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        const { error } = await supabase
          .from("group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", userId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "remove_member",
          target_type: "group",
          target_id: groupId,
          details: { removed_user_id: userId },
        });

        return { error: null };
      } catch (error) {
        console.error("Error removing member:", error);
        return { error };
      }
    },
    [user]
  );

  const assignGroupRole = useCallback(
    async (
      groupId: string,
      userId: string,
      role: "admin" | "moderator" | "member"
    ) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        if (role === "member") {
          // Remove role entry (member is default)
          await supabase
            .from("user_roles")
            .delete()
            .eq("group_id", groupId)
            .eq("user_id", userId);
        } else {
          // Upsert role
          const { error } = await supabase.from("user_roles").upsert(
            {
              group_id: groupId,
              user_id: userId,
              role,
            },
            { onConflict: "group_id,user_id", ignoreDuplicates: false }
          );
          if (error) throw error;
        }

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "assign_group_role",
          target_type: "group",
          target_id: groupId,
          details: { user_id: userId, role },
        });

        return { error: null };
      } catch (error) {
        console.error("Error assigning group role:", error);
        return { error };
      }
    },
    [user]
  );

  return {
    fetchGroups,
    fetchGroupMembers,
    updateGroupSettings,
    removeMember,
    assignGroupRole,
    loading,
  };
}
