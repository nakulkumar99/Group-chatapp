import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface UploadResult {
  url: string;
  fileName: string;
  fileType: string;
}

export function useFileUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return null;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return null;
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "video/mp4",
      "video/webm",
      "audio/mpeg",
      "audio/wav",
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("File type not supported");
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Create unique file path
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-attachments")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create signed URL (1 hour expiry)
      const { data: signedData, error: signedError } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(fileName, 3600);

      if (signedError || !signedData) {
        throw signedError || new Error("Failed to create signed URL");
      }

      setProgress(100);

      return {
        url: signedData.signedUrl,
        fileName: file.name,
        fileType: file.type,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
  };
}
