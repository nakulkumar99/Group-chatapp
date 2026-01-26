import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickAvatarUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentAvatar: string | null;
  username: string;
  onAvatarChange: (url: string | null) => void;
}

export function QuickAvatarUploader({
  isOpen,
  onClose,
  userId,
  currentAvatar,
  username,
  onAvatarChange,
}: QuickAvatarUploaderProps) {
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

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

      if (currentAvatar?.includes("profile-images")) {
        const oldPath = currentAvatar.split("/profile-images/")[1];
        if (oldPath) {
          await supabase.storage.from("profile-images").remove([oldPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      onAvatarChange(urlData.publicUrl);
      toast.success("Avatar uploaded successfully!");
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload avatar");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (currentAvatar?.includes("profile-images")) {
      const filePath = currentAvatar.split("/profile-images/")[1];
      if (filePath) {
        await supabase.storage.from("profile-images").remove([filePath]);
      }
    }
    onAvatarChange(null);
    setPreviewUrl(null);
    toast.success("Avatar removed");
    onClose();
  };

  const displayAvatar = previewUrl || currentAvatar;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Change Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-primary">
              {displayAvatar ? (
                <AvatarImage src={displayAvatar} alt={username} />
              ) : null}
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(username || "U")}
              </AvatarFallback>
            </Avatar>

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
              disabled={uploading}
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            {currentAvatar && (
              <Button
                variant="outline"
                className="flex-1 text-destructive hover:text-destructive"
                onClick={handleRemoveAvatar}
                disabled={uploading}
              >
                <X className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
