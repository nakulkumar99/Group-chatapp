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
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Search,
  MoreHorizontal,
  Shield,
  Ban,
  UserX,
  ChevronLeft,
  ChevronRight,
  Phone,
  CheckCircle2,
  XCircle,
  UserPlus,
  Eye,
} from "lucide-react";
import { useAdminUsers, type UserWithStatus } from "@/hooks/useAdminUsers";
import { useAdminRole } from "@/hooks/useAdminRole";
import { usePhoneAuth } from "@/hooks/usePhoneAuth";
import { useToast } from "@/hooks/use-toast";
import { BanUserModal } from "./BanUserModal";
import { RoleSelector } from "./RoleSelector";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { UserDetailModal } from "./UserDetailModal";
import { CreateEditUserForm } from "./CreateEditUserForm";
import { BulkActionBar } from "./BulkActionBar";
import { PasswordConfirmDialog } from "./PasswordConfirmDialog";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import type { CreateUserInput } from "@/lib/validations";

type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface PendingRoleChange {
  userId: string;
  username: string;
  role: GlobalAdminRole | null;
}
type UserStatus = "active" | "inactive" | "suspended";

export function UserManagement() {
  const {
    fetchUsers,
    updateUser,
    deleteUser,
    bulkActivate,
    bulkDeactivate,
    bulkDelete,
    assignRole,
    banUser,
    unbanUser,
    loading,
  } = useAdminUsers();
  const { sendOTP } = usePhoneAuth();
  const { isSuperAdmin, isNakulYT } = useAdminRole();
  const canManageRoles = isSuperAdmin || isNakulYT;
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<string>("all");

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);

  const pageSize = 20;

  const loadUsers = useCallback(async () => {
    const roleArg = roleFilter === "all" ? undefined : (roleFilter as GlobalAdminRole | "user");
    const statusArg = statusFilter === "all" ? undefined : (statusFilter as UserStatus | "banned");
    const verifiedArg = verifiedFilter === "all" ? undefined : verifiedFilter === "verified";

    const { users: fetchedUsers, total: fetchedTotal } = await fetchUsers(
      page,
      pageSize,
      search || undefined,
      roleArg,
      statusArg,
      verifiedArg
    );

    setUsers(fetchedUsers);
    setTotal(fetchedTotal);
    setSelectedUsers(new Set());
  }, [fetchUsers, page, search, roleFilter, statusFilter, verifiedFilter]);

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

  const handleDelete = async () => {
    if (!selectedUser) return;

    const result = await deleteUser(selectedUser.user_id);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      loadUsers();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    setDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleEditSubmit = async (data: CreateUserInput & { avatar_url?: string; role?: GlobalAdminRole | null }) => {
    if (!selectedUser) return { success: false };

    const result = await updateUser(selectedUser.user_id, data);
    if (result.success) {
      toast({ title: "Success", description: result.message });
      loadUsers();
      setEditModalOpen(false);
      setSelectedUser(null);
    } else if (result.message) {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    return result;
  };

  const handleSendOTP = async () => {
    if (!selectedUser?.phone_number) return;

    const result = await sendOTP(selectedUser.phone_number);
    if (result.success) {
      toast({ title: "Success", description: "OTP sent successfully" });
    } else {
      toast({
        title: "Error",
        description: result.message || "Failed to send OTP",
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(users.map((u) => u.user_id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkActivate = async () => {
    const result = await bulkActivate(Array.from(selectedUsers));
    if (result.success) {
      toast({ title: "Success", description: result.message });
      loadUsers();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleBulkDeactivate = async () => {
    const result = await bulkDeactivate(Array.from(selectedUsers));
    if (result.success) {
      toast({ title: "Success", description: result.message });
      loadUsers();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    const result = await bulkDelete(Array.from(selectedUsers));
    if (result.success) {
      toast({ title: "Success", description: result.message });
      loadUsers();
    } else {
      toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: UserStatus, isBanned: boolean) => {
    if (isBanned) return <Badge variant="destructive">Banned</Badge>;
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and bans</p>
        </div>
        <Button onClick={() => {
          setSelectedUser(null);
          setEditModalOpen(true);
        }}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by username or phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Verified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="unverified">Unverified</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedUsers.size === users.length && users.length > 0}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all users"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Joined</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedUser(user);
                    setDetailModalOpen(true);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedUsers.has(user.user_id)}
                      onCheckedChange={(checked) => handleSelectUser(user.user_id, !!checked)}
                      aria-label={`Select ${user.username}`}
                    />
                  </TableCell>
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
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{user.phone_number || "—"}</span>
                      {user.phone_number && (
                        user.phone_verified ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {canManageRoles ? (
                      <RoleSelector
                        currentRole={user.role}
                        onRoleChange={(role) => handleRoleChange(user.user_id, role)}
                      />
                    ) : (
                      <Badge variant={user.role ? (user.role === "super_admin" ? "destructive" : "default") : "outline"}>
                        {user.role ? user.role.replace(/_/g, " ") : "User"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user.status, user.isBanned)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setDetailModalOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setEditModalOpen(true);
                          }}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
                        {(isSuperAdmin || isNakulYT) && (
                          <>
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
                          </>
                        )}
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

      <BulkActionBar
        selectedCount={selectedUsers.size}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedUsers(new Set())}
        loading={loading}
      />

      <BanUserModal
        open={banModalOpen}
        onOpenChange={setBanModalOpen}
        onConfirm={handleBan}
        username={selectedUser?.username}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleDelete}
        title="Delete Account"
        description={`Are you sure you want to permanently delete ${selectedUser?.username}'s account? This action cannot be undone.`}
      />

      <UserDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        user={selectedUser}
        isSuperAdmin={isSuperAdmin}
        onEdit={() => {
          setDetailModalOpen(false);
          setEditModalOpen(true);
        }}
        onBan={() => {
          setDetailModalOpen(false);
          if (selectedUser?.isBanned) {
            handleUnban(selectedUser.user_id);
          } else {
            setBanModalOpen(true);
          }
        }}
        onDelete={() => {
          setDetailModalOpen(false);
          setDeleteModalOpen(true);
        }}
        onSendOTP={handleSendOTP}
      />

      <CreateEditUserForm
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUser}
        onSubmit={handleEditSubmit}
        loading={loading}
      />
    </div>
  );
}
