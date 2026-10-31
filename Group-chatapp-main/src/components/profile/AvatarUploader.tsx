import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, X, Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvatarUploaderProps {
  userId: string;
  currentAvatar: string | null;
  username: string;
  onAvatarChange: (url: string | null) => void;
}

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
  "https://api.dicebear.com/7.x/bottts/svg?seed=Zephyr",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Nova",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Star",
];

export function AvatarUploader({
  userId,
  currentAvatar,
  username,
  onAvatarChange,
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input to allow re-uploading same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, and GIF are allowed.");
      return;
    }

    // Validate file size (max 5MB for avatar)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    // Create preview immediately for instant feedback
    const previewDataUrl = URL.createObjectURL(file);
    setPreviewUrl(previewDataUrl);

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if it's a custom upload
      if (currentAvatar?.includes("profile-images")) {
        try {
          const url = new URL(currentAvatar);
          const pathMatch = url.pathname.match(/\/profile-images\/(.+)/);
          if (pathMatch && pathMatch[1]) {
            const oldPath = decodeURIComponent(pathMatch[1]);
            await supabase.storage.from("profile-images").remove([oldPath]);
          }
        } catch {
          // Ignore URL parsing errors for old avatars
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      // Add cache-busting query param for immediate display
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      
      onAvatarChange(publicUrl);
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar. Please try again.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Clean up object URL
      if (previewDataUrl) {
        URL.revokeObjectURL(previewDataUrl);
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (currentAvatar?.includes("profile-images")) {
      try {
        const url = new URL(currentAvatar.split("?")[0]); // Remove query params
        const pathMatch = url.pathname.match(/\/profile-images\/(.+)/);
        if (pathMatch && pathMatch[1]) {
          const filePath = decodeURIComponent(pathMatch[1]);
          await supabase.storage.from("profile-images").remove([filePath]);
        }
      } catch {
        // Ignore URL parsing errors
      }
    }
    onAvatarChange(null);
    setPreviewUrl(null);
    toast.success("Avatar removed");
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <div className="space-y-6">
      {/* Main Avatar Display */}
      <div className="flex flex-col items-center">
        <div className="relative group">
          <Avatar className="w-28 h-28 border-4 border-primary">
            {displayAvatar ? (
              <AvatarImage src={displayAvatar} alt={username} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
              {getInitials(username || "U")}
            </AvatarFallback>
          </Avatar>
          
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
            disabled={uploading}
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Photo
          </Button>
          {currentAvatar && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteAvatar}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Preset Avatars */}
      <div>
        <p className="text-sm text-muted-foreground mb-3 text-center">Or choose a preset avatar</p>
        <div className="grid grid-cols-8 gap-2">
          {AVATAR_OPTIONS.map((avatar, index) => (
            <motion.button
              key={avatar}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.02 * index }}
              onClick={() => {
                onAvatarChange(avatar);
                setPreviewUrl(null);
              }}
              className={`relative w-10 h-10 rounded-full overflow-hidden transition-all ${
                currentAvatar === avatar
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : "hover:opacity-80"
              }`}
            >
              <img
                src={avatar}
                alt={`Avatar ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {currentAvatar === avatar && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
