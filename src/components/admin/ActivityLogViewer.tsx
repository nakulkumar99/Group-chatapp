import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Clock, User, Shield, Edit, Ban, Trash2, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: unknown;
  created_at: string;
  admin_profile?: {
    username: string;
  };
}

interface ActivityLogViewerProps {
  userId?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  create_user: <UserPlus className="h-4 w-4" />,
  update_user: <Edit className="h-4 w-4" />,
  delete_user: <Trash2 className="h-4 w-4" />,
  assign_role: <Shield className="h-4 w-4" />,
  remove_role: <Shield className="h-4 w-4" />,
  ban_user: <Ban className="h-4 w-4" />,
  unban_user: <Shield className="h-4 w-4" />,
  activate_user: <User className="h-4 w-4" />,
  deactivate_user: <User className="h-4 w-4" />,
  send_otp: <Clock className="h-4 w-4" />,
  verify_otp: <Shield className="h-4 w-4" />,
};

const ACTION_COLORS: Record<string, string> = {
  create_user: "bg-green-500/10 text-green-500 border-green-500/20",
  update_user: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  delete_user: "bg-red-500/10 text-red-500 border-red-500/20",
  assign_role: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  remove_role: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  ban_user: "bg-red-500/10 text-red-500 border-red-500/20",
  unban_user: "bg-green-500/10 text-green-500 border-green-500/20",
  activate_user: "bg-green-500/10 text-green-500 border-green-500/20",
  deactivate_user: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  send_otp: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  verify_otp: "bg-green-500/10 text-green-500 border-green-500/20",
};

export function ActivityLogViewer({ userId }: ActivityLogViewerProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (userId) {
        query = query.eq("target_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setLogs([]);
        return;
      }

      // Fetch admin profiles
      const adminIds = [...new Set(data.map((l) => l.admin_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username")
        .in("user_id", adminIds);

      const profileMap = new Map(
        profiles?.map((p) => [p.user_id, { username: p.username }])
      );

      const logsWithProfiles: ActivityLog[] = data.map((log) => ({
        ...log,
        admin_profile: profileMap.get(log.admin_id),
      }));

      setLogs(logsWithProfiles);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity logs found
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2">
        {logs.map((log) => (
          <Collapsible
            key={log.id}
            open={expandedLog === log.id}
            onOpenChange={(open) => setExpandedLog(open ? log.id : null)}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left">
                <div className="flex-shrink-0 mt-0.5">
                  {ACTION_ICONS[log.action] || <Clock className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={ACTION_COLORS[log.action] || ""}>
                      {formatAction(log.action)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      by {log.admin_profile?.username || "Unknown"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedLog === log.id ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-7 mt-2 p-3 bg-muted/30 rounded-lg text-sm">
                <p className="text-muted-foreground mb-2">
                  Target: {log.target_type}
                  {log.target_id && (
                    <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                      {log.target_id}
                    </code>
                  )}
                </p>
                {log.details && Object.keys(log.details as object).length > 0 && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );
}
