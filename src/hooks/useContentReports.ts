import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type ReportStatus = "pending" | "reviewed" | "dismissed";

interface ContentReport {
  id: string;
  reporter_id: string;
  message_id: string;
  reason: string;
  status: ReportStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter_profile?: {
    username: string;
    avatar_url: string | null;
  };
  message?: {
    content: string;
    user_id: string;
    group_id: string;
    sender_profile?: {
      username: string;
    };
    group?: {
      name: string;
    };
  };
}

export function useContentReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(
    async (page: number = 0, pageSize: number = 20, status?: ReportStatus) => {
      setLoading(true);

      try {
        let query = supabase
          .from("content_reports")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (status) {
          query = query.eq("status", status);
        }

        const { data: reports, count, error } = await query;

        if (error) throw error;

        if (!reports || reports.length === 0) {
          return { reports: [], total: 0 };
        }

        // Fetch reporter profiles
        const reporterIds = [...new Set(reports.map((r) => r.reporter_id))];
        const { data: reporterProfiles } = await supabase
          .from("profiles")
          .select("user_id, username, avatar_url")
          .in("user_id", reporterIds);

        const reporterMap = new Map(
          reporterProfiles?.map((p) => [p.user_id, { username: p.username, avatar_url: p.avatar_url }])
        );

        // Fetch messages
        const messageIds = [...new Set(reports.map((r) => r.message_id))];
        const { data: messages } = await supabase
          .from("messages")
          .select("id, content, user_id, group_id")
          .in("id", messageIds);

        // Fetch message sender profiles and groups
        const senderIds = [...new Set(messages?.map((m) => m.user_id) || [])];
        const groupIds = [...new Set(messages?.map((m) => m.group_id) || [])];

        const { data: senderProfiles } = await supabase
          .from("profiles")
          .select("user_id, username")
          .in("user_id", senderIds);

        const { data: groups } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds);

        const senderMap = new Map(senderProfiles?.map((p) => [p.user_id, { username: p.username }]));
        const groupMap = new Map(groups?.map((g) => [g.id, { name: g.name }]));
        const messageMap = new Map(
          messages?.map((m) => [
            m.id,
            {
              content: m.content,
              user_id: m.user_id,
              group_id: m.group_id,
              sender_profile: senderMap.get(m.user_id),
              group: groupMap.get(m.group_id),
            },
          ])
        );

        const reportsWithDetails: ContentReport[] = reports.map((report) => ({
          ...report,
          status: report.status as ReportStatus,
          reporter_profile: reporterMap.get(report.reporter_id),
          message: messageMap.get(report.message_id),
        }));

        return { reports: reportsWithDetails, total: count || 0 };
      } catch (error) {
        console.error("Error fetching reports:", error);
        return { reports: [], total: 0 };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateReportStatus = useCallback(
    async (reportId: string, status: ReportStatus) => {
      if (!user) return { error: new Error("Not authenticated") };

      try {
        const { error } = await supabase
          .from("content_reports")
          .update({
            status,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", reportId);

        if (error) throw error;

        await supabase.from("audit_logs").insert({
          admin_id: user.id,
          action: "review_report",
          target_type: "report",
          target_id: reportId,
          details: { new_status: status },
        });

        return { error: null };
      } catch (error) {
        console.error("Error updating report status:", error);
        return { error };
      }
    },
    [user]
  );

  const getPendingCount = useCallback(async () => {
    try {
      const { count, error } = await supabase
        .from("content_reports")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error("Error getting pending count:", error);
      return 0;
    }
  }, []);

  return {
    fetchReports,
    updateReportStatus,
    getPendingCount,
    loading,
  };
}
