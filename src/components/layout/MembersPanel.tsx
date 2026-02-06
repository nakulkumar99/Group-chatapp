import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, X, Crown, ShieldCheck, Shield, User, MoreVertical, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { usePresence } from "@/hooks/usePresence";
import { useGroupRole } from "@/hooks/useGroupRole";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";
import { useAuth } from "@/hooks/useAuth";

interface MembersPanelProps {
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
  creatorId?: string;
  currentUserId?: string;
  isMobile: boolean;
}

type AppRole = "admin" | "moderator" | "member";

export function MembersPanel({
  groupId,
  isOpen,
  onClose,
  creatorId,
  currentUserId,
  isMobile,
}: MembersPanelProps) {
  const { user } = useAuth();
  const { members, loading } = useGroupMembers(groupId);
  const { onlineCount, isUserOnline, isUserTyping } = usePresence(groupId);
  const { groupRoles, isAdmin, isCreator, updateRoleViaAPI } = useGroupRole(groupId);

  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: string;
    username: string;
    newRole: AppRole;
  } | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberRole = (userId: string): AppRole | null => {
    if (userId === creatorId) return "admin"; // Creator is always admin
    const role = groupRoles.find((r) => r.user_id === userId);
    return role?.role || null;
  };

  const getMemberRoleIcon = (userId: string) => {
    if (userId === creatorId) {
      return <Crown className="w-3.5 h-3.5 text-amber-500" />;
    }
    const role = getMemberRole(userId);
    if (role === "admin") {
      return <ShieldCheck className="w-3.5 h-3.5 text-primary" />;
    }
    if (role === "moderator") {
      return <Shield className="w-3.5 h-3.5 text-sky-500" />;
    }
    return <User className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  const getMemberRoleLabel = (userId: string): string => {
    if (userId === creatorId) {
      return "Owner";
    }
    const role = getMemberRole(userId);
    if (role === "admin") return "Admin";
    if (role === "moderator") return "Moderator";
    return "Member";
  };

  const handleRoleChangeClick = (userId: string, username: string, newRole: AppRole) => {
    setPendingRoleChange({ userId, username, newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;

    setIsUpdatingRole(true);
    await updateRoleViaAPI(pendingRoleChange.userId, pendingRoleChange.newRole);
    setIsUpdatingRole(false);
    setPendingRoleChange(null);
  };

  const panelContent = (
    <div className="h-full flex flex-col bg-card/95 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Members ({members.length})</h2>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAdminSettings(!showAdminSettings)}
              className={`hover:bg-accent rounded-full ${showAdminSettings ? "bg-accent" : ""}`}
            >
              <Settings className="w-5 h-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-accent rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Admin Settings Panel */}
      <AnimatePresence>
        {showAdminSettings && isAdmin && groupId && user && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="p-4">
              <AdminSettingsPanel groupId={groupId} currentUserId={user.id} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Count */}
      <div className="px-4 py-2 border-b border-border bg-accent/30">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-online animate-pulse" />
          {onlineCount} online now
        </p>
      </div>

      {/* Members List */}
      <ScrollArea className="flex-1 p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
          </div>
        ) : (
          <div className="space-y-1">
            {members.map((member) => {
              const memberIsOnline = isUserOnline(member.user_id);
              const memberIsTyping = isUserTyping(member.user_id);
              const roleIcon = getMemberRoleIcon(member.user_id);
              const roleLabel = getMemberRoleLabel(member.user_id);
              const isOwner = member.user_id === creatorId;
              const isSelf = member.user_id === currentUserId;
              const canModifyRole = isAdmin && !isOwner && !isSelf;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                >
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={member.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {getInitials(member.profile?.username || "U")}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card transition-colors ${
                        memberIsOnline ? "bg-online" : "bg-muted-foreground/50"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-foreground truncate">
                        {member.profile?.username || "Unknown"}
                      </p>
                      {roleIcon}
                    </div>
                    {memberIsTyping ? (
                      <span className="text-xs text-primary animate-pulse">typing...</span>
                    ) : (
                      <span className="text-xs text-primary">{roleLabel}</span>
                    )}
                  </div>

                  {/* Three-dot menu for role management (Admin only) */}
                  {canModifyRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChangeClick(
                              member.user_id,
                              member.profile?.username || "Unknown",
                              "admin"
                            )
                          }
                        >
                          <Crown className="w-4 h-4 mr-2 text-amber-500" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChangeClick(
                              member.user_id,
                              member.profile?.username || "Unknown",
                              "moderator"
                            )
                          }
                        >
                          <Shield className="w-4 h-4 mr-2 text-sky-500" />
                          Make Moderator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            handleRoleChangeClick(
                              member.user_id,
                              member.profile?.username || "Unknown",
                              "member"
                            )
                          }
                        >
                          <User className="w-4 h-4 mr-2 text-muted-foreground" />
                          Make Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog
        open={pendingRoleChange !== null}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Role</AlertDialogTitle>
            <AlertDialogDescription>
              Change {pendingRoleChange?.username} to {pendingRoleChange?.newRole}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingRole}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange} disabled={isUpdatingRole}>
              {isUpdatingRole ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  // Mobile overlay
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-80 z-50 shadow-2xl"
            >
              {panelContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop slide panel
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-l border-border overflow-hidden shrink-0"
        >
          {panelContent}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
