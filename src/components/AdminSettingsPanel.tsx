import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  ShieldCheck,
  User,
  Crown,
  ChevronDown,
  Sun,
  Moon,
  Palette,
  Image,
  Upload,
  Check,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
import { useThemeContext } from "@/components/layout/ThemeProvider";
import { toast } from "sonner";

interface AdminSettingsPanelProps {
  groupId: string;
  currentUserId: string;
  variant?: "full" | "admin-only";
  compact?: boolean;
}

type AppRole = "admin" | "moderator" | "member";

export function AdminSettingsPanel({
  groupId,
  currentUserId,
  variant = "full",
  compact = false,
}: AdminSettingsPanelProps) {
  const {
    isAdmin,
    isCreator,
    groupRoles,
    groupSettings,
    updateRoleViaAPI,
    removeRole,
    updateSettings,
  } = useGroupRole(groupId);

  const { members } = useGroupMembers(groupId);
  const {
    theme,
    toggleTheme,
    wallpaper,
    presets,
    setPreset,
    setCustom,
    setOpacity,
    clearWallpaper,
  } = useThemeContext();

  const [settingsOpen, setSettingsOpen] = useState(true);
  const [rolesOpen, setRolesOpen] = useState(true);
  const [appearanceOpen, setAppearanceOpen] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const showAppearance = variant === "full";
  const avatarSize = compact ? "w-8 h-8" : "w-10 h-10";
  const contentPadding = compact ? "p-3" : "p-4";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberRole = (userId: string): AppRole | null => {
    const roleEntry = groupRoles.find((r) => r.user_id === userId);
    return roleEntry?.role || null;
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
      await updateRoleViaAPI(userId, role);
    }
  };

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustom(dataUrl);
      setUploading(false);
      toast.success("Wallpaper updated!");
    };
    reader.onerror = () => {
      toast.error("Failed to load image");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Admin Settings - Only show for admins */}
      {isAdmin && (
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto hover:bg-accent/50"
            >
              <span className="flex items-center gap-2 font-medium text-sm">
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`space-y-4 ${contentPadding} bg-accent/30 rounded-lg mt-2`}
            >
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
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Section 2: Manage Roles - Only show for admins */}
      {isAdmin && (
        <Collapsible open={rolesOpen} onOpenChange={setRolesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto hover:bg-accent/50"
            >
              <span className="flex items-center gap-2 font-medium text-sm">
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2 mt-2"
            >
              {members.map((member) => {
                const memberRole = getMemberRole(member.user_id);
                const isMemberCreator = isCreator && member.user_id === currentUserId;
                const canModify = isCreator && member.user_id !== currentUserId;

                return (
                  <div
                    key={member.user_id}
                    className="flex items-center gap-3 p-2 bg-accent/30 rounded-lg"
                  >
                    <Avatar className={avatarSize}>
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
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, "admin")}
                            >
                              <ShieldCheck className="w-4 h-4 mr-2 text-primary" />
                              Make Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, "moderator")}
                            >
                              <Shield className="w-4 h-4 mr-2 text-sky-500" />
                              Make Moderator
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRoleChange(member.user_id, "member")}
                            >
                              <User className="w-4 h-4 mr-2" />
                              Make Member
                            </DropdownMenuItem>
                            {memberRole && memberRole !== "member" && (
                              <DropdownMenuItem
                                onClick={() => handleRoleChange(member.user_id, "remove")}
                              >
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
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Section 3: Appearance - Show for everyone when variant is "full" */}
      {showAppearance && (
        <Collapsible open={appearanceOpen} onOpenChange={setAppearanceOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-3 py-2 h-auto hover:bg-accent/50"
            >
              <span className="flex items-center gap-2 font-medium text-sm">
                <Palette className="w-4 h-4" />
                Appearance
              </span>
              <motion.div
                animate={{ rotate: appearanceOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`space-y-4 ${contentPadding} bg-accent/30 rounded-lg mt-2`}
            >
              {/* Theme Toggle - Segmented Control */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Theme</Label>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => theme === "dark" && toggleTheme()}
                    className="flex-1 gap-2 transition-all duration-300"
                    size="sm"
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => theme === "light" && toggleTheme()}
                    className="flex-1 gap-2 transition-all duration-300"
                    size="sm"
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </Button>
                </div>
              </div>

              {/* Chat Wallpaper */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Chat Wallpaper
                </Label>

                {/* Preset Wallpapers Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setPreset(preset.id)}
                      className={`relative h-16 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                        wallpaper.type === "preset" && wallpaper.value === preset.id
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                      style={{
                        backgroundImage: `url("${preset.url}")`,
                        backgroundColor:
                          theme === "dark" ? "hsl(var(--muted))" : "hsl(var(--background))",
                      }}
                    >
                      {wallpaper.type === "preset" && wallpaper.value === preset.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCustomUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full gap-2"
                  size="sm"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Upload Custom Wallpaper"}
                </Button>

                {/* Custom Preview */}
                {wallpaper.type === "custom" && (
                  <div className="relative h-16 rounded-lg border border-primary overflow-hidden">
                    <img
                      src={wallpaper.value}
                      alt="Custom wallpaper"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                )}

                {/* Clear Wallpaper */}
                <Button
                  variant="ghost"
                  onClick={clearWallpaper}
                  className="w-full gap-2 text-muted-foreground hover:text-foreground"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Wallpaper
                </Button>
              </div>

              {/* Opacity Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Wallpaper Opacity</Label>
                  <span className="text-xs text-muted-foreground">{wallpaper.opacity}%</span>
                </div>
                <Slider
                  value={[wallpaper.opacity]}
                  onValueChange={(v) => setOpacity(v[0])}
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* If not admin and no appearance section, show nothing */}
      {!isAdmin && !showAppearance && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No settings available
        </p>
      )}
    </div>
  );
}
