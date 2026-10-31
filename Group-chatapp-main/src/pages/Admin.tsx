import { Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/hooks/useAuth";
import { ProfileAdminDashboard } from "@/components/admin/ProfileAdminDashboard";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { user, initializing } = useAuth();
  const { isAdmin, isModerator, isNakulYT, loading: roleLoading } = useAdminRole();
  const { toast } = useToast();

  const isLoading = initializing || roleLoading;
  const hasAccess = isAdmin || isModerator || isNakulYT;

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
    <div className="min-h-screen bg-background">
      <ProfileAdminDashboard />
    </div>
  );
}
