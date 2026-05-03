import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface AdminRoleState {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isNakulYT: boolean;
  role: GlobalAdminRole | null;
  loading: boolean;
}

export function useAdminRole() {
  const { user } = useAuth();
  const [state, setState] = useState<AdminRoleState>({
    isAdmin: false,
    isSuperAdmin: false,
    isModerator: false,
    isNakulYT: false,
    role: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({
        isAdmin: false,
        isSuperAdmin: false,
        isModerator: false,
        isNakulYT: false,
        role: null,
        loading: false,
      });
      return;
    }

    const checkAdminRole = async () => {
      // Check admin role
      const { data, error } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      // Check if user is Nakul_YT
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      const isNakulYT = profileData?.username === "Nakul_YT";

      if (error) {
        console.error("Error checking admin role:", error);
        setState((prev) => ({ ...prev, loading: false, isNakulYT }));
        return;
      }

      if (data) {
        const role = data.role as GlobalAdminRole;
        setState({
          isAdmin: role === "super_admin" || role === "admin",
          isSuperAdmin: role === "super_admin",
          isModerator: role === "moderator",
          isNakulYT,
          role,
          loading: false,
        });
      } else {
        setState({
          isAdmin: false,
          isSuperAdmin: false,
          isModerator: false,
          isNakulYT,
          role: null,
          loading: false,
        });
      }
    };

    checkAdminRole();
  }, [user]);

  return state;
}
