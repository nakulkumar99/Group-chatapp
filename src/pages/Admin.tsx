import { Routes, Route, Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { UserManagement } from "@/components/admin/UserManagement";
import { ContentModeration } from "@/components/admin/ContentModeration";
import { GroupManagement } from "@/components/admin/GroupManagement";
import { AuditLogs } from "@/components/admin/AuditLogs";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { user, initializing } = useAuth();
  const { isAdmin, isModerator, loading: roleLoading } = useAdminRole();
  const { toast } = useToast();

  const isLoading = initializing || roleLoading;
  const hasAccess = isAdmin || isModerator;

  useEffect(() => {
    if (!isLoading && user && !hasAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel",
        variant: "destructive",
      });
    }
  }, [isLoading, user, hasAccess, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="content" element={<ContentModeration />} />
          <Route path="groups" element={<GroupManagement />} />
          <Route path="logs" element={<AuditLogs />} />
        </Routes>
      </main>
    </div>
  );
}
