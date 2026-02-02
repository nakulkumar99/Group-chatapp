import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

interface AdminRole {
  user_id: string;
  role: GlobalAdminRole;
}

interface UserBan {
  user_id: string;
  banned_by: string;
  reason: string | null;
  banned_at: string;
  expires_at: string | null;
}

interface UserWithStatus extends Profile {
  role: GlobalAdminRole | null;
  isBanned: boolean;
  ban?: UserBan;
}

export function useAdminUsers() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(
    async (
      page: number = 0,
      pageSize: number = 20,
      search?: string,
      roleFilter?: GlobalAdminRole | "user",
      statusFilter?: "active" | "banned"
    ) => {
      setLoading(true);

      try {
        // Fetch profiles
        let profileQuery = supabase
          .from("profiles")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (search) {
          profileQuery = profileQuery.ilike("username", `%${search}%`);
        }

        const { data: profiles, count, error: profileError } = await profileQuery;

        if (profileError) throw profileError;

        if (!profiles || profiles.length === 0) {
          return { users: [], total: 0 };
        }

        const userIds = profiles.map((p) => p.user_id);

        // Fetch admin roles for these users
        const { data: adminRoles } = await supabase
          .from("admin_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        // Fetch bans for these users
        const { data: bans } = await supabase
          .from("user_bans")
          .select("*")
          .in("user_id", userIds);

        const roleMap = new Map<string, GlobalAdminRole>();
        adminRoles?.forEach((r) => roleMap.set(r.user_id, r.role as GlobalAdminRole));

        const banMap = new Map<string, UserBan>();
        bans?.forEach((b) => banMap.set(b.user_id, b as UserBan));

        let users: UserWithStatus[] = profiles.map((profile) => ({
          ...profile,
          role: roleMap.get(profile.user_id) || null,
          isBanned: banMap.has(profile.user_id),
          ban: banMap.get(profile.user_id),
        }));

        // Apply client-side filters
        if (roleFilter) {
          if (roleFilter === "user") {
            users = users.filter((u) => !u.role);
          } else {
            users = users.filter((u) => u.role === roleFilter);
          }
        }

        if (statusFilter) {
          users = users.filter((u) =>
            statusFilter === "banned" ? u.isBanned : !u.isBanned
          );
        }

        return { users, total: count || 0 };
      } catch (error) {
        console.error("Error fetching users:", error);
        return { users: [], total: 0 };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const assignRole = useCallback(
    async (userId: string, role: GlobalAdminRole | null) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        if (role === null) {
          // Remove role
          const { error } = await supabase
            .from("admin_roles")
            .delete()
            .eq("user_id", userId);
          if (error) throw error;
        } else {
          // Upsert role
          const { error } = await supabase.from("admin_roles").upsert(
            {
              user_id: userId,
              role,
              created_by: user.id,
            },
            { onConflict: "user_id" }
          );
          if (error) throw error;
        }

        // Log action
        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: role ? "assign_role" : "remove_role",
          target_type: "user",
          target_id: userId,
          details: { role },
        });

        return { error: null };
      } catch (error) {
        console.error("Error assigning role:", error);
        return { error };
      }
    },
    [user]
  );

  const banUser = useCallback(
    async (userId: string, reason: string, expiresAt?: Date) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        const { error } = await supabase.from("user_bans").insert({
          user_id: userId,
          banned_by: user.id,
          reason,
          expires_at: expiresAt?.toISOString() || null,
        });

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "ban_user",
          target_type: "user",
          target_id: userId,
          details: { reason, expires_at: expiresAt?.toISOString() },
        });

        return { error: null };
      } catch (error) {
        console.error("Error banning user:", error);
        return { error };
      }
    },
    [user]
  );

  const unbanUser = useCallback(
    async (userId: string) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        const { error } = await supabase
          .from("user_bans")
          .delete()
          .eq("user_id", userId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "unban_user",
          target_type: "user",
          target_id: userId,
          details: {},
        });

        return { error: null };
      } catch (error) {
        console.error("Error unbanning user:", error);
        return { error };
      }
    },
    [user]
  );

  return {
    fetchUsers,
    assignRole,
    banUser,
    unbanUser,
    loading,
  };
}
