import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Users2, AlertTriangle, UserPlus, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useContentReports } from "@/hooks/useContentReports";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
  totalUsers: number;
  totalMessages: number;
  totalGroups: number;
  pendingReports: number;
  newUsersWeek: number;
  messagesToday: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { getPendingCount } = useContentReports();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch counts in parallel
        const [
          { count: totalUsers },
          { count: totalMessages },
          { count: totalGroups },
          pendingReports,
          { count: newUsersWeek },
          { count: messagesToday },
        ] = await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("messages").select("*", { count: "exact", head: true }),
          supabase.from("groups").select("*", { count: "exact", head: true }),
          getPendingCount(),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .gte("created_at", new Date().toISOString().split("T")[0]),
        ]);

        setStats({
          totalUsers: totalUsers || 0,
          totalMessages: totalMessages || 0,
          totalGroups: totalGroups || 0,
          pendingReports,
          newUsersWeek: newUsersWeek || 0,
          messagesToday: messagesToday || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [getPendingCount]);

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers,
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Total Messages",
      value: stats?.totalMessages,
      icon: MessageSquare,
      color: "text-green-500",
    },
    {
      title: "Active Groups",
      value: stats?.totalGroups,
      icon: Users2,
      color: "text-purple-500",
    },
    {
      title: "Pending Reports",
      value: stats?.pendingReports,
      icon: AlertTriangle,
      color: "text-yellow-500",
    },
    {
      title: "New Users (7 days)",
      value: stats?.newUsersWeek,
      icon: UserPlus,
      color: "text-cyan-500",
    },
    {
      title: "Messages Today",
      value: stats?.messagesToday,
      icon: Activity,
      color: "text-pink-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={cn("h-5 w-5", card.color)} />
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  {card.value?.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
