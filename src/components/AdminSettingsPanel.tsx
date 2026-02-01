import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, ShieldCheck, User, Crown, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGroupRole } from "@/hooks/useGroupRole";
import { useGroupMembers } from "@/hooks/useGroupMembers";

interface AdminSettingsPanelProps {
  groupId: string;
  currentUserId: string;
}

type AppRole = "admin" | "moderator" | "member";

export function AdminSettingsPanel({ groupId, currentUserId }: AdminSettingsPanelProps) {
  const {
    isAdmin,
    isCreator,
    groupRoles,
    groupSettings,
    setRole,
    removeRole,
    updateSettings,
  } = useGroupRole(groupId);

  const { members } = useGroupMembers(groupId);
  const [rolesOpen, setRolesOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(true);

  if (!isAdmin) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberRole = (userId: string): AppRole | null => {
    const creatorCheck = groupRoles.find((r) => r.user_id === userId);
    const role = creatorCheck?.role || null;
    return role;
  };

  const getRoleIcon = (role: AppRole | null, userId: string) => {
    // Creator gets crown
    if (isCreator && userId === currentUserId) {
      return <Crown className="w-4 h-4 text-amber-500" />;
    }
    switch (role) {
      case "admin":
        return <ShieldCheck className="w-4 h-4 text-primary" />;
      case "moderator":
        return <Shield className="w-4 h-4 text-sky-500" />;
      default:
        return <User className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const handleRoleChange = async (userId: string, role: AppRole | "remove") => {
    if (role === "remove") {
      await removeRole(userId);
    } else {
      await setRole(userId, role);
    }
  };

  return (
    <div className="space-y-4">
      {/* Group Settings */}
      <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
            <span className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4" />
              Admin Settings
            </span>
            <motion.div
              animate={{ rotate: settingsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 p-3 bg-accent/30 rounded-lg mt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="only-admins-send" className="text-sm">
                Only admins can send messages
              </Label>
              <Switch
                id="only-admins-send"
                checked={groupSettings.only_admins_can_send}
                onCheckedChange={(checked) =>
                  updateSettings({ only_admins_can_send: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="only-admins-add" className="text-sm">
                Only admins can add members
              </Label>
              <Switch
                id="only-admins-add"
                checked={groupSettings.only_admins_can_add_members}
                onCheckedChange={(checked) =>
                  updateSettings({ only_admins_can_add_members: checked })
                }
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Member Roles */}
      <Collapsible open={rolesOpen} onOpenChange={setRolesOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-3 py-2 h-auto">
            <span className="flex items-center gap-2 font-medium">
              <Shield className="w-4 h-4" />
              Manage Roles
            </span>
            <motion.div
              animate={{ rotate: rolesOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 mt-2">
            {members.map((member) => {
              const memberRole = getMemberRole(member.user_id);
              const isMemberCreator = isCreator && member.user_id === currentUserId;
              const canModify = isCreator && member.user_id !== currentUserId;

              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-2 bg-accent/30 rounded-lg"
                >
                  <Avatar className="w-8 h-8">
                    {member.profile?.avatar_url && (
                      <AvatarImage src={member.profile.avatar_url} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(member.profile?.username || "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {member.profile?.username || "Unknown"}
                      {member.user_id === currentUserId && (
                        <span className="text-muted-foreground ml-1">(you)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleIcon(memberRole, member.user_id)}
                    {canModify && !isMemberCreator && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "admin")}>
                            <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "moderator")}>
                            <Shield className="w-4 h-4 mr-2 text-blue-500" />
                            Make Moderator
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "member")}>
                            <User className="w-4 h-4 mr-2" />
                            Make Member
                          </DropdownMenuItem>
                          {memberRole && memberRole !== "member" && (
                            <DropdownMenuItem onClick={() => handleRoleChange(member.user_id, "remove")}>
                              Remove Role
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
