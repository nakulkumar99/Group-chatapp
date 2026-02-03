import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface AdminRoleState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  role: GlobalAdminRole | null;
  loading: boolean;
}

export function useAdminRole() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminRoleState>({
    isAdmin: false,
    isSuperAdmin: false,
    isModerator: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({
        isAdmin: false,
        isSuperAdmin: false,
        isModerator: false,
        role: null,
        loading: false,
      });
      return;
    }

    const checkAdminRole = async () => {
      const { data, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // RLS may block access if user has no admin role - this is expected
        console.log("Admin role check:", error.code === "PGRST116" ? "No admin role" : error.message);
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          isModerator: false,
          role: null,
          loading: false,
        });
        return;
      }

      if (data) {
        const role = data.role as GlobalAdminRole;
        setState({
          isAdmin: role === "super_admin" || role === "admin",
          isSuperAdmin: role === "super_admin",
          isModerator: role === "moderator",
          role,
          loading: false,
        });
      } else {
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          isModerator: false,
          role: null,
          loading: false,
        });
      }
    };

    checkAdminRole();
  }, [user]);

  return state;
}
