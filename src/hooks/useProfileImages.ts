import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ProfileImage {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
}

export function useProfileImages() {
  const { user } = useAuth();
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchImages();
      subscribeToChanges();
    } else {
      setImages([]);
      setLoading(false);
    }
  }, [user]);

  const fetchImages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profile_images")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setImages(data);
    }
    setLoading(false);
  };

  const subscribeToChanges = () => {
    if (!user) return;

    const channel = supabase
      .channel("profile_images_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profile_images",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchImages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB.");
    }

    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-images")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("profile-images")
        .getPublicUrl(fileName);

      const imageUrl = urlData.publicUrl;

      // Save to profile_images table
      const { error: dbError } = await supabase
        .from("profile_images")
        .insert({
          user_id: user.id,
          image_url: imageUrl,
        });

      if (dbError) throw dbError;

      await fetchImages();
      return imageUrl;
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: string, imageUrl: string) => {
    if (!user) return;

    // Extract file path from URL
    const urlParts = imageUrl.split("/profile-images/");
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      await supabase.storage.from("profile-images").remove([filePath]);
    }

    await supabase.from("profile_images").delete().eq("id", imageId);
    await fetchImages();
  };

  return {
    images,
    loading,
    uploading,
    uploadImage,
    deleteImage,
    refetch: fetchImages,
  };
}
