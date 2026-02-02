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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreHorizontal, Shield, Ban, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useToast } from "@/hooks/use-toast";
import { BanUserModal } from "./BanUserModal";
import { RoleSelector } from "./RoleSelector";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { format } from "date-fns";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface UserWithStatus {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  role: GlobalAdminRole | null;
  isBanned: boolean;
}

export function UserManagement() {
  const { fetchUsers, assignRole, banUser, unbanUser, loading } = useAdminUsers();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [banModalOpen, setBanModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);

  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    const roleArg = roleFilter === "all" ? undefined : (roleFilter as GlobalAdminRole | "user");
    const statusArg = statusFilter === "all" ? undefined : (statusFilter as "active" | "banned");

    const { users: fetchedUsers, total: fetchedTotal } = await fetchUsers(
      page,
      pageSize,
      search || undefined,
      roleArg,
      statusArg
    );

    setUsers(fetchedUsers);
    setTotal(fetchedTotal);
  }, [fetchUsers, page, search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  const handleRoleChange = async (userId: string, role: GlobalAdminRole | null) => {
    const { error } = await assignRole(userId, role);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to assign role",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Role updated successfully" });
      loadUsers();
    }
  };

  const handleBan = async (reason: string, expiresAt?: Date) => {
    if (!selectedUser) return;

    const { error } = await banUser(selectedUser.user_id, reason, expiresAt);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "User banned successfully" });
      loadUsers();
    }
    setBanModalOpen(false);
    setSelectedUser(null);
  };

  const handleUnban = async (userId: string) => {
    const { error } = await unbanUser(userId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to unban user",
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "User unbanned successfully" });
      loadUsers();
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">Manage users, roles, and bans</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderator</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                    <RoleSelector
                      currentRole={user.role}
                      onRoleChange={(role) => handleRoleChange(user.user_id, role)}
                    />
                  </TableCell>
                  <TableCell>
                    {user.isBanned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.isBanned ? (
                          <DropdownMenuItem onClick={() => handleUnban(user.user_id)}>
                            <Shield className="mr-2 h-4 w-4" />
                            Unban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setBanModalOpen(true);
                            }}
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ban User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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

      <BanUserModal
        open={banModalOpen}
        onOpenChange={setBanModalOpen}
        onConfirm={handleBan}
        username={selectedUser?.username}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={() => {
          // Note: Account deletion requires server-side implementation
          toast({
            title: "Not implemented",
            description: "Account deletion requires server-side implementation",
            variant: "destructive",
          });
          setDeleteModalOpen(false);
        }}
        title="Delete Account"
        description={`Are you sure you want to delete ${selectedUser?.username}'s account? This action cannot be undone.`}
      />
    </div>
  );
}
