import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: unknown;
  created_at: string;
  admin_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export function useAuditLogs() {
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(
    async (
      page: number = 0,
      pageSize: number = 20,
      actionFilter?: string,
      adminFilter?: string,
      startDate?: Date,
      endDate?: Date
    ) => {
      setLoading(true);

      try {
        let query = supabase
          .from("audit_logs")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (actionFilter) {
          query = query.eq("action", actionFilter);
        }

        if (adminFilter) {
          query = query.eq("admin_id", adminFilter);
        }

        if (startDate) {
          query = query.gte("created_at", startDate.toISOString());
        }

        if (endDate) {
          query = query.lte("created_at", endDate.toISOString());
        }

        const { data: logs, count, error } = await query;

        if (error) throw error;

        if (!logs || logs.length === 0) {
          return { logs: [], total: 0 };
        }

        // Fetch admin profiles
        const adminIds = [...new Set(logs.map((l) => l.admin_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", adminIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, { username: p.username, avatar_url: p.avatar_url }])
        );

        const logsWithProfiles: AuditLog[] = logs.map((log) => ({
          ...log,
          admin_profile: profileMap.get(log.admin_id),
        }));

        return { logs: logsWithProfiles, total: count || 0 };
      } catch (error) {
        console.error("Error fetching audit logs:", error);
        return { logs: [], total: 0 };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getActionTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("action")
        .limit(1000);

      if (error) throw error;

      const actions = [...new Set(data?.map((d) => d.action) || [])];
      return actions;
    } catch (error) {
      console.error("Error fetching action types:", error);
      return [];
    }
  }, []);

  const exportToCSV = useCallback(
    async (
      actionFilter?: string,
      adminFilter?: string,
      startDate?: Date,
      endDate?: Date
    ) => {
      try {
        let query = supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false });

        if (actionFilter) query = query.eq("action", actionFilter);
        if (adminFilter) query = query.eq("admin_id", adminFilter);
        if (startDate) query = query.gte("created_at", startDate.toISOString());
        if (endDate) query = query.lte("created_at", endDate.toISOString());

        const { data, error } = await query;

        if (error) throw error;

        // Convert to CSV
        const headers = ["ID", "Admin ID", "Action", "Target Type", "Target ID", "Details", "Created At"];
        const rows = data?.map((log) => [
          log.id,
          log.admin_id,
          log.action,
          log.target_type,
          log.target_id || "",
          JSON.stringify(log.details),
          log.created_at,
        ]);

        const csv = [headers.join(","), ...(rows?.map((r) => r.join(",")) || [])].join("\n");

        // Download
        const blob = new Blob([csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        return { error: null };
      } catch (error) {
        console.error("Error exporting logs:", error);
        return { error };
      }
    },
    []
  );

  return {
    fetchLogs,
    getActionTypes,
    exportToCSV,
    loading,
  };
}
