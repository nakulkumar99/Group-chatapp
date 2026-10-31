import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Phone, User, Calendar, Shield, CheckCircle2, XCircle, Edit, Ban, Trash2 } from "lucide-react";
import { ActivityLogViewer } from "./ActivityLogViewer";

type UserStatus = "active" | "inactive" | "suspended";
type GlobalAdminRole = "super_admin" | "admin" | "moderator";

interface UserData {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  phone_number: string | null;
  phone_verified: boolean;
  status: UserStatus;
  created_at: string;
  role: GlobalAdminRole | null;
  isBanned: boolean;
}

interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  isSuperAdmin: boolean;
  onEdit: () => void;
  onBan: () => void;
  onDelete: () => void;
  onSendOTP: () => void;
}

export function UserDetailModal({
  open,
  onOpenChange,
  user,
  isSuperAdmin,
  onEdit,
  onBan,
  onDelete,
  onSendOTP,
}: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!user) return null;

  const getStatusBadge = (status: UserStatus, isBanned: boolean) => {
    if (isBanned) return <Badge variant="destructive">Banned</Badge>;
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: GlobalAdminRole | null) => {
    if (!role) return <Badge variant="outline">User</Badge>;
    switch (role) {
      case "super_admin":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Super Admin</Badge>;
      case "admin":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Admin</Badge>;
      case "moderator":
        return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">Moderator</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-auto space-y-6 mt-4">
            {/* Profile Header */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xl">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{user.username}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {getStatusBadge(user.status, user.isBanned)}
                  {getRoleBadge(user.role)}
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="grid gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
                <span>{user.phone_number || "Not set"}</span>
                {user.phone_number && (
                  user.phone_verified ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={onSendOTP}>
                        Send OTP
                      </Button>
                    </div>
                  )
                )}
              </div>

              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Bio:</span>
                <span className="text-muted-foreground">{user.bio || "No bio"}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Joined:</span>
                <span>{format(new Date(user.created_at), "MMMM d, yyyy 'at' h:mm a")}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">User ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{user.user_id}</code>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit User
              </Button>
              <Button
                variant={user.isBanned ? "outline" : "secondary"}
                size="sm"
                onClick={onBan}
              >
                <Ban className="h-4 w-4 mr-2" />
                {user.isBanned ? "Unban User" : "Ban User"}
              </Button>
              {isSuperAdmin && (
                <Button variant="destructive" size="sm" onClick={onDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-auto mt-4">
            <ActivityLogViewer userId={user.user_id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
