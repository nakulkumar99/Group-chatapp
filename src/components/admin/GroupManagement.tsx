import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, ChevronDown, Users, UserMinus } from "lucide-react";
import { useAdminGroups } from "@/hooks/useAdminGroups";
import { useToast } from "@/hooks/use-toast";

interface GroupSettings {
  only_admins_can_send?: boolean;
  only_admins_can_add_members?: boolean;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  settings: GroupSettings | null;
  created_at: string;
  member_count?: number;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  joined_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  user_roles?: {
    role: string;
  }[];
}

export function GroupManagement() {
  const {
    fetchGroups,
    fetchGroupMembers,
    updateGroupSettings,
    removeMember,
    assignGroupRole,
    loading,
  } = useAdminGroups();
  const { toast } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});

  const loadGroups = useCallback(async () => {
    const { groups: fetched } = await fetchGroups(search || undefined);
    setGroups(fetched);
  }, [fetchGroups, search]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleExpandGroup = async (groupId: string) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      return;
    }

    setExpandedGroup(groupId);

    if (!groupMembers[groupId]) {
      const { members } = await fetchGroupMembers(groupId);
      setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
    }
  };

  const handleSettingChange = async (
    groupId: string,
    setting: keyof GroupSettings,
    value: boolean
  ) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;

    const newSettings: GroupSettings = {
      ...group.settings,
      [setting]: value,
    };

    const { error } = await updateGroupSettings(groupId, newSettings);
    if (error) {
      toast({ title: "Error", description: "Failed to update settings", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Settings updated" });
      loadGroups();
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    const { error } = await removeMember(groupId, userId);
    if (error) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Member removed" });
      const { members } = await fetchGroupMembers(groupId);
      setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
      loadGroups();
    }
  };

  const handleRoleChange = async (
    groupId: string,
    userId: string,
    role: "admin" | "moderator" | "member"
  ) => {
    const { error } = await assignGroupRole(groupId, userId, role);
    if (error) {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Role updated" });
      const { members } = await fetchGroupMembers(groupId);
      setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Group Management</h1>
        <p className="text-muted-foreground">Manage group permissions and members</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search groups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : groups.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No groups found</p>
        ) : (
          groups.map((group) => (
            <Collapsible
              key={group.id}
              open={expandedGroup === group.id}
              onOpenChange={() => handleExpandGroup(group.id)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {group.member_count} members
                          </p>
                        </div>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-muted-foreground transition-transform ${
                          expandedGroup === group.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="space-y-6 pt-0">
                    <div className="space-y-4">
                      <h4 className="font-medium text-foreground">Permissions</h4>
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`send-${group.id}`} className="text-sm">
                            Only admins can send messages
                          </Label>
                          <Switch
                            id={`send-${group.id}`}
                            checked={group.settings?.only_admins_can_send || false}
                            onCheckedChange={(checked) =>
                              handleSettingChange(group.id, "only_admins_can_send", checked)
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`add-${group.id}`} className="text-sm">
                            Only admins can add members
                          </Label>
                          <Switch
                            id={`add-${group.id}`}
                            checked={group.settings?.only_admins_can_add_members || false}
                            onCheckedChange={(checked) =>
                              handleSettingChange(group.id, "only_admins_can_add_members", checked)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-foreground">Members</h4>
                      <div className="space-y-2">
                        {groupMembers[group.id]?.map((member) => {
                          const memberRole = member.user_roles?.[0]?.role || "member";
                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-accent/30 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.profiles?.avatar_url || undefined} />
                                  <AvatarFallback>
                                    {member.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {member.profiles?.username || "Unknown"}
                                  </p>
                                  <Badge variant="secondary" className="text-xs">
                                    {memberRole}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Select
                                  value={memberRole}
                                  onValueChange={(value) =>
                                    handleRoleChange(
                                      group.id,
                                      member.user_id,
                                      value as "admin" | "moderator" | "member"
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-[120px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="moderator">Moderator</SelectItem>
                                    <SelectItem value="member">Member</SelectItem>
                                  </SelectContent>
                                </Select>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMember(group.id, member.user_id)}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        }) || (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            Loading members...
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
