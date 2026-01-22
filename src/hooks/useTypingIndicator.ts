import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface TypingUser {
  user_id: string;
  username: string;
}

export function useTypingIndicator(groupId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!groupId || !user) return;

    const channel = supabase.channel(`typing:${groupId}`);
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: TypingUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.user_id !== user.id && presence.is_typing) {
              users.push({
                user_id: presence.user_id,
                username: presence.username,
              });
            }
          });
        });
        
        setTypingUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            username: user.email?.split("@")[0] || "User",
            is_typing: false,
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [groupId, user]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await channelRef.current.track({
      user_id: user.id,
      username: user.email?.split("@")[0] || "User",
      is_typing: true,
    });

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      await channelRef.current?.track({
        user_id: user.id,
        username: user.email?.split("@")[0] || "User",
        is_typing: false,
      });
    }, 3000);
  }, [user]);

  const stopTyping = useCallback(async () => {
    if (!channelRef.current || !user) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await channelRef.current.track({
      user_id: user.id,
      username: user.email?.split("@")[0] || "User",
      is_typing: false,
    });
  }, [user]);

  return { typingUsers, startTyping, stopTyping };
}
