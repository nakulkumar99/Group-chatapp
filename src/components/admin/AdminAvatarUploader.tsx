import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2 } from "lucide-react";

interface AdminAvatarUploaderProps {
  currentUrl: string | null;
  onUpload: (url: string | null) => void;
  userId?: string;
}

export function AdminAvatarUploader({
  currentUrl,
  onUpload,
  userId,
}: AdminAvatarUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/gif"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, or GIF image",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Show preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      setUploading(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId || "temp"}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-images")
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("profile-images")
          .getPublicUrl(filePath);

        const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        onUpload(publicUrl);
        setPreviewUrl(publicUrl);

        toast({
          title: "Success",
          description: "Avatar uploaded successfully",
        });
      } catch (error) {
        console.error("Error uploading avatar:", error);
        setPreviewUrl(currentUrl);
        toast({
          title: "Upload failed",
          description: "Could not upload avatar. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    },
    [userId, currentUrl, onUpload, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUpload(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className={`relative cursor-pointer rounded-full ${
          dragOver ? "ring-2 ring-primary ring-offset-2" : ""
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Avatar className="h-24 w-24">
          <AvatarImage src={previewUrl || undefined} />
          <AvatarFallback className="text-2xl bg-muted">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </AvatarFallback>
        </Avatar>
        {previewUrl && !uploading && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif"
        className="hidden"
        onChange={handleInputChange}
        aria-label="Upload avatar"
      />

      <p className="text-xs text-muted-foreground text-center">
        Click or drag to upload
        <br />
        JPG, PNG, GIF up to 5MB
      </p>
    </div>
  );
}
