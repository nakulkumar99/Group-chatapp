import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, User, Settings, Lock, ImageIcon, LogOut, Loader2, Link2, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AvatarUploader } from "@/components/profile/AvatarUploader";
import { ProfileImagesGallery } from "@/components/profile/ProfileImagesGallery";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyProfileLink = async () => {
    const profileUrl = `${window.location.origin}/profile`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setLinkCopied(true);
      toast.success("Link Copied!", { duration: 2000 });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setBio(profile.bio || "");
      setSelectedAvatar(profile.avatar_url);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user || !username.trim()) {
      toast.error("Username is required");
      return;
    }

    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }

    setSaving(true);

    const { error } = await updateProfile({
      username: username.trim(),
      avatar_url: selectedAvatar,
      bio: bio.trim() || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success("Profile updated successfully");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-primary shadow-lg">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-primary-foreground/10 text-primary-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary-foreground" />
            <h1 className="font-semibold text-primary-foreground text-lg">Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-6"
        >
          <Avatar className="w-24 h-24 border-4 border-primary shadow-lg">
            {selectedAvatar ? (
              <AvatarImage src={selectedAvatar} alt={username} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {getInitials(username || "U")}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 text-lg font-semibold text-foreground">{username}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          
          {/* Copy Profile Link Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-4"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyProfileLink}
              className="gap-2 transition-all duration-200"
            >
              <motion.div
                animate={{ scale: linkCopied ? [1, 1.2, 1] : 1 }}
                transition={{ duration: 0.2 }}
              >
                {linkCopied ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
              </motion.div>
              {linkCopied ? "Link Copied!" : "Copy Profile Link"}
            </Button>
          </motion.div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-6 space-y-6"
            >
              <AvatarUploader
                userId={user?.id || ""}
                currentAvatar={selectedAvatar}
                username={username}
                onAvatarChange={setSelectedAvatar}
              />

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    maxLength={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself..."
                    maxLength={200}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length}/200
                  </p>
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </motion.div>
          </TabsContent>

          {/* Images Tab */}
          <TabsContent value="images">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-6"
            >
              <ProfileImagesGallery 
                onSelectAsAvatar={(imageUrl) => {
                  setSelectedAvatar(imageUrl);
                  setActiveTab("profile");
                }}
              />
            </motion.div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-xl p-6 space-y-6"
            >
              <div>
                <h3 className="text-sm font-medium text-foreground mb-4">Change Password</h3>
                <ChangePasswordForm />
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Account</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign out from your account on this device.
                </p>
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
