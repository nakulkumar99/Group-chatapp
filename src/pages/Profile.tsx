import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

// Predefined avatar options
const AVATAR_OPTIONS = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Bella",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Henry",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ivy",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Kate",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zephyr",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Echo",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Pixel",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star",
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setSelectedAvatar(profile.avatar_url);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user || !username.trim()) {
      toast.error("Username is required");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim(),
        avatar_url: selectedAvatar,
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success("Profile updated successfully");
    refetch();
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[hsl(174,57%,26%)] shadow-lg">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="hover:bg-white/10 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-white" />
            <h1 className="font-semibold text-white text-lg">Profile</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {/* Current Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <Avatar className="w-24 h-24 border-4 border-[hsl(149,67%,38%)]">
            {selectedAvatar ? (
              <AvatarImage src={selectedAvatar} alt={username} />
            ) : null}
            <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white text-2xl">
              {getInitials(username || "U")}
            </AvatarFallback>
          </Avatar>
          <p className="mt-3 text-lg font-semibold text-foreground">{username}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </motion.div>

        {/* Username Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Label htmlFor="username" className="text-foreground mb-2 block">
            Username
          </Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="bg-muted border-border"
            maxLength={30}
          />
        </motion.div>

        {/* Avatar Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <Label className="text-foreground mb-4 block">Choose Avatar</Label>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-3">
            {/* No avatar option */}
            <button
              onClick={() => setSelectedAvatar(null)}
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                selectedAvatar === null
                  ? "ring-2 ring-[hsl(149,67%,38%)] ring-offset-2 ring-offset-background"
                  : "hover:opacity-80"
              }`}
            >
              <Avatar className="w-full h-full">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                  {getInitials(username || "U")}
                </AvatarFallback>
              </Avatar>
              {selectedAvatar === null && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[hsl(149,67%,38%)] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </button>

            {AVATAR_OPTIONS.map((avatar, index) => (
              <motion.button
                key={avatar}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index }}
                onClick={() => setSelectedAvatar(avatar)}
                className={`relative w-12 h-12 rounded-full overflow-hidden transition-all ${
                  selectedAvatar === avatar
                    ? "ring-2 ring-[hsl(149,67%,38%)] ring-offset-2 ring-offset-background"
                    : "hover:opacity-80"
                }`}
              >
                <img
                  src={avatar}
                  alt={`Avatar ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                {selectedAvatar === avatar && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[hsl(149,67%,38%)] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)] text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Sign Out
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
