import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useToast } from "@/hooks/use-toast";
import { RoleSelector } from "./RoleSelector";
import { PasswordConfirmDialog } from "./PasswordConfirmDialog";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface PendingRoleChange {
  userId: string;
  username: string;
  role: GlobalAdminRole | null;
}

export function RoleManagement() {
  const { fetchUsers, assignRole, loading } = useAdminUsers();
  const { fetchLogs } = useAuditLogs();
  const { toast } = useToast();

  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const pageSize = 15;

  const loadUsers = useCallback(async () => {
    const { users: fetched, total: t } = await fetchUsers(page, pageSize, search || undefined);
    setUsers(fetched);
    setTotal(t);
  }, [fetchUsers, page, search]);

  const loadRecentLogs = useCallback(async () => {
    const { logs } = await fetchLogs(0, 10, undefined, undefined);
    const roleLogs = logs.filter(
      (l: any) => l.action === "assign_role" || l.action === "remove_role"
    );
    setRecentLogs(roleLogs.slice(0, 5));
  }, [fetchLogs]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadRecentLogs();
  }, [loadRecentLogs]);

  const handleRoleChangeRequest = (userId: string, username: string, role: GlobalAdminRole | null) => {
    setPendingChange({ userId, username, role });
    setConfirmOpen(true);
  };

  const handleConfirmedRoleChange = async () => {
    if (!pendingChange) return;

    const { error } = await assignRole(pendingChange.userId, pendingChange.role);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Role Updated",
        description: `${pendingChange.username}'s role has been updated`,
      });
      loadUsers();
      loadRecentLogs();
    }
    setPendingChange(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    moderator: "Moderator",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Role Management
        </h1>
        <p className="text-muted-foreground">Assign and manage user roles with password confirmation</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="pl-9"
        />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role ? (user.role === "super_admin" ? "destructive" : "default") : "outline"}>
                      {user.role ? roleLabels[user.role] || user.role : "User"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <RoleSelector
                      currentRole={user.role}
                      onRoleChange={(role) => handleRoleChangeRequest(user.user_id, user.username, role)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {users.length} of {total} users
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {recentLogs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Recent Role Changes</h2>
          <div className="border rounded-lg divide-y">
            {recentLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={log.admin_profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {log.admin_profile?.username?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">
                    <span className="font-medium">{log.admin_profile?.username || "Unknown"}</span>
                    {" "}
                    {log.action === "assign_role" ? "assigned" : "removed"} role
                    {log.details?.role && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {roleLabels[log.details.role as string] || log.details.role}
                      </Badge>
                    )}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.created_at), "MMM d, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <PasswordConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmedRoleChange}
        title="Confirm Role Change"
        description={
          pendingChange
            ? `You are about to change ${pendingChange.username}'s role to ${pendingChange.role ? roleLabels[pendingChange.role] : "User"}. Enter your password to confirm.`
            : "Enter your password to confirm this role change."
        }
      />
    </div>
  );
}
