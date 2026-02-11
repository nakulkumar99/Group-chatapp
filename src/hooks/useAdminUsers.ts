import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Json } from "@/integrations/supabase/types";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";
type UserStatus = "active" | "inactive" | "suspended";

interface Profile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  status: UserStatus;
  created_at: string;
}

interface PhoneData {
  user_id: string;
  phone_number: string | null;
  phone_verified: boolean;
  phone_verified_at: string | null;
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

export interface UserWithStatus extends Profile {
  phone_number: string | null;
  phone_verified: boolean;
  phone_verified_at: string | null;
  role: GlobalAdminRole | null;
  isBanned: boolean;
  ban?: UserBan;
}

interface CreateUserData {
  phone_number: string;
  username: string;
  bio?: string;
  status?: UserStatus;
  avatar_url?: string;
  role?: GlobalAdminRole | null;
}

interface UpdateUserData {
  phone_number?: string;
  username?: string;
  bio?: string;
  status?: UserStatus;
  avatar_url?: string;
  role?: GlobalAdminRole | null;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
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
      statusFilter?: UserStatus | "banned",
      verifiedFilter?: boolean
    ) => {
      setLoading(true);

      try {
        // Fetch profiles with new columns
        let profileQuery = supabase
          .from("profiles")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (search) {
          profileQuery = profileQuery.ilike("username", `%${search}%`);
        }

        if (statusFilter && statusFilter !== "banned") {
          profileQuery = profileQuery.eq("status", statusFilter);
        }

        const { data: profiles, count, error: profileError } = await profileQuery;

        if (profileError) throw profileError;

        if (!profiles || profiles.length === 0) {
          return { users: [], total: 0 };
        }

        const userIds = profiles.map((p) => p.user_id);

        // Fetch phone data from separate secure table
        const { data: phoneData } = await supabase
          .from("user_phone_data")
          .select("user_id, phone_number, phone_verified, phone_verified_at")
          .in("user_id", userIds);

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

        const phoneMap = new Map<string, PhoneData>();
        phoneData?.forEach((p) => phoneMap.set(p.user_id, p as PhoneData));

        const roleMap = new Map<string, GlobalAdminRole>();
        adminRoles?.forEach((r) => roleMap.set(r.user_id, r.role as GlobalAdminRole));

        const banMap = new Map<string, UserBan>();
        bans?.forEach((b) => banMap.set(b.user_id, b as UserBan));

        let users: UserWithStatus[] = profiles.map((profile) => {
          const phone = phoneMap.get(profile.user_id);
          return {
            ...profile,
            phone_number: phone?.phone_number || null,
            phone_verified: phone?.phone_verified || false,
            phone_verified_at: phone?.phone_verified_at || null,
            status: (profile.status as UserStatus) || "active",
            role: roleMap.get(profile.user_id) || null,
            isBanned: banMap.has(profile.user_id),
            ban: banMap.get(profile.user_id),
          };
        });

        // Apply phone verified filter client-side (data is in separate table)
        if (verifiedFilter !== undefined) {
          users = users.filter((u) => u.phone_verified === verifiedFilter);
        }

        // Apply client-side filters
        if (roleFilter) {
          if (roleFilter === "user") {
            users = users.filter((u) => !u.role);
          } else {
            users = users.filter((u) => u.role === roleFilter);
          }
        }

        if (statusFilter === "banned") {
          users = users.filter((u) => u.isBanned);
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

  const createUser = useCallback(
    async (data: CreateUserData): Promise<ApiResponse> => {
      if (!user) return { success: false, message: "Not authenticated" };

      try {
        // Check if phone number already exists in user_phone_data
        const { data: existing } = await supabase
          .from("user_phone_data")
          .select("user_id")
          .eq("phone_number", data.phone_number)
          .single();

        if (existing) {
          return {
            success: false,
            errors: { phone_number: ["Phone number already in use"] },
          };
        }

        // Check if username already exists
        const { data: existingUsername } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", data.username)
          .single();

        if (existingUsername) {
          return {
            success: false,
            errors: { username: ["Username already taken"] },
          };
        }

        // Note: Creating a new auth user requires server-side implementation
        // For now, we can only update existing profiles
        return {
          success: false,
          message: "Creating new auth users requires server-side implementation",
        };
      } catch (error) {
        console.error("Error creating user:", error);
        return { success: false, message: "An unexpected error occurred" };
      }
    },
    [user]
  );

  const updateUser = useCallback(
    async (userId: string, data: UpdateUserData): Promise<ApiResponse> => {
      if (!user) return { success: false, message: "Not authenticated" };

      try {
        // Check phone number uniqueness if updating
        if (data.phone_number) {
          const { data: existing } = await supabase
            .from("user_phone_data")
            .select("user_id")
            .eq("phone_number", data.phone_number)
            .neq("user_id", userId)
            .single();

          if (existing) {
            return {
              success: false,
              errors: { phone_number: ["Phone number already in use"] },
            };
          }
        }

        // Check username uniqueness if updating
        if (data.username) {
          const { data: existing } = await supabase
            .from("profiles")
            .select("user_id")
            .eq("username", data.username)
            .neq("user_id", userId)
            .single();

          if (existing) {
            return {
              success: false,
              errors: { username: ["Username already taken"] },
            };
          }
        }

        // Update profile
        const profileUpdate: Record<string, unknown> = {};
        if (data.username !== undefined) profileUpdate.username = data.username;
        if (data.bio !== undefined) profileUpdate.bio = data.bio;
        if (data.status !== undefined) profileUpdate.status = data.status;
        if (data.avatar_url !== undefined) profileUpdate.avatar_url = data.avatar_url;

        if (Object.keys(profileUpdate).length > 0) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update(profileUpdate)
            .eq("user_id", userId);

          if (profileError) throw profileError;
        }

        // Update phone data in separate table if provided
        if (data.phone_number !== undefined) {
          await supabase
            .from("user_phone_data")
            .upsert({
              user_id: userId,
              phone_number: data.phone_number,
            }, { onConflict: "user_id" });
        }

        // Handle role assignment
        if (data.role !== undefined) {
          if (data.role === null) {
            await supabase.from("admin_roles").delete().eq("user_id", userId);
          } else {
            await supabase.from("admin_roles").upsert(
              { user_id: userId, role: data.role, created_by: user.id },
              { onConflict: "user_id" }
            );
          }
        }

        // Log action
        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "update_user",
          target_type: "user",
          target_id: userId,
          details: data as Json,
        });

        return { success: true, message: "User updated successfully" };
      } catch (error) {
        console.error("Error updating user:", error);
        return { success: false, message: "Failed to update user" };
      }
    },
    [user]
  );

  const deleteUser = useCallback(
    async (userId: string): Promise<ApiResponse> => {
      if (!user) return { success: false, message: "Not authenticated" };

      try {
        // Note: Full account deletion requires server-side implementation
        // For now, we mark the user as suspended
        const { error } = await supabase
          .from("profiles")
          .update({ status: "suspended" })
          .eq("user_id", userId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "delete_user",
          target_type: "user",
          target_id: userId,
          details: { soft_delete: true } as Json,
        });

        return { success: true, message: "User account suspended" };
      } catch (error) {
        console.error("Error deleting user:", error);
        return { success: false, message: "Failed to delete user" };
      }
    },
    [user]
  );

  const bulkActivate = useCallback(
    async (userIds: string[]): Promise<ApiResponse> => {
      if (!user) return { success: false, message: "Not authenticated" };

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "active" })
          .in("user_id", userIds);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "activate_user",
          target_type: "users",
          target_id: null,
          details: { user_ids: userIds, count: userIds.length } as Json,
        });

        return { success: true, message: `${userIds.length} users activated` };
      } catch (error) {
        console.error("Error activating users:", error);
        return { success: false, message: "Failed to activate users" };
      }
    },
    [user]
  );

  const bulkDeactivate = useCallback(
    async (userIds: string[]): Promise<ApiResponse> => {
      if (!user) return { success: false, message: "Not authenticated" };

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "inactive" })
          .in("user_id", userIds);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "deactivate_user",
          target_type: "users",
          target_id: null,
          details: { user_ids: userIds, count: userIds.length } as Json,
        });

        return { success: true, message: `${userIds.length} users deactivated` };
      } catch (error) {
        console.error("Error deactivating users:", error);
        return { success: false, message: "Failed to deactivate users" };
      }
    },
    [user]
  );

  const bulkDelete = useCallback(
    async (userIds: string[]): Promise<ApiResponse> => {
      if (!user) return { success: false, message: "Not authenticated" };

      try {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "suspended" })
          .in("user_id", userIds);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "delete_user",
          target_type: "users",
          target_id: null,
          details: { user_ids: userIds, count: userIds.length, soft_delete: true } as Json,
        });

        return { success: true, message: `${userIds.length} users deleted` };
      } catch (error) {
        console.error("Error deleting users:", error);
        return { success: false, message: "Failed to delete users" };
      }
    },
    [user]
  );

  const assignRole = useCallback(
    async (userId: string, role: GlobalAdminRole | null) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        if (role === null) {
          const { error } = await supabase
            .from("admin_roles")
            .delete()
            .eq("user_id", userId);
          if (error) throw error;
        } else {
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

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: role ? "assign_role" : "remove_role",
          target_type: "user",
          target_id: userId,
          details: { role } as Json,
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
          details: { reason, expires_at: expiresAt?.toISOString() } as Json,
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
          details: {} as Json,
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
    createUser,
    updateUser,
    deleteUser,
    bulkActivate,
    bulkDeactivate,
    bulkDelete,
    assignRole,
    banUser,
    unbanUser,
    loading,
  };
}
