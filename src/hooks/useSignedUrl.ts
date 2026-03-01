import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Extracts the storage path from a Supabase storage URL (public or signed).
 * Returns the path after /chat-attachments/ in the URL.
 */
function extractStoragePath(url: string): string | null {
  try {
    const match = url.match(/\/chat-attachments\/(.+?)(\?|$)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Hook to get a signed URL for a chat attachment.
 * Handles both old public URLs and already-signed URLs.
 */
export function useSignedUrl(fileUrl: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fileUrl) {
      setSignedUrl(null);
      return;
    }

    // If not a chat-attachments URL, use as-is
    if (!fileUrl.includes("chat-attachments")) {
      setSignedUrl(fileUrl);
      return;
    }

    const path = extractStoragePath(fileUrl);
    if (!path) {
      setSignedUrl(fileUrl);
      return;
    }

    setLoading(true);

    supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 3600)
      .then(({ data, error }) => {
        if (error || !data) {
          setSignedUrl(fileUrl);
        } else {
          setSignedUrl(data.signedUrl);
        }
        setLoading(false);
      });
  }, [fileUrl]);

  return { signedUrl, loading };
}
