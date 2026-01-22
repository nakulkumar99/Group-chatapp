import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface OnlineUser {
  user_id: string;
  username: string;
  is_typing: boolean;
  online_at: string;
}

interface PresenceState {
  onlineUsers: Map<string, OnlineUser>;
  typingUsers: OnlineUser[];
}

export function usePresence(groupId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<PresenceState>({
    onlineUsers: new Map(),
    typingUsers: [],
  });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!groupId || !user) return;

    const channel = supabase.channel(`presence:${groupId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const presenceState = channel.presenceState();
        const onlineUsers = new Map<string, OnlineUser>();
        const typingUsers: OnlineUser[] = [];

        Object.entries(presenceState).forEach(([key, presences]) => {
          const presence = (presences as any[])[0];
          if (presence) {
            const onlineUser: OnlineUser = {
              user_id: presence.user_id,
              username: presence.username,
              is_typing: presence.is_typing || false,
              online_at: presence.online_at,
            };
            onlineUsers.set(presence.user_id, onlineUser);

            if (presence.is_typing && presence.user_id !== user.id) {
              typingUsers.push(onlineUser);
            }
          }
        });

        setState({ onlineUsers, typingUsers });
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            username: user.email?.split("@")[0] || "User",
            is_typing: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [groupId, user]);

  const startTyping = useCallback(async () => {
    if (!channelRef.current || !user) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    await channelRef.current.track({
      user_id: user.id,
      username: user.email?.split("@")[0] || "User",
      is_typing: true,
      online_at: new Date().toISOString(),
    });

    typingTimeoutRef.current = setTimeout(async () => {
      await channelRef.current?.track({
        user_id: user.id,
        username: user.email?.split("@")[0] || "User",
        is_typing: false,
        online_at: new Date().toISOString(),
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
      online_at: new Date().toISOString(),
    });
  }, [user]);

  const isUserOnline = useCallback(
    (userId: string) => {
      return state.onlineUsers.has(userId);
    },
    [state.onlineUsers]
  );

  const isUserTyping = useCallback(
    (userId: string) => {
      return state.typingUsers.some((u) => u.user_id === userId);
    },
    [state.typingUsers]
  );

  return {
    onlineUsers: state.onlineUsers,
    typingUsers: state.typingUsers,
    onlineCount: state.onlineUsers.size,
    startTyping,
    stopTyping,
    isUserOnline,
    isUserTyping,
  };
}
