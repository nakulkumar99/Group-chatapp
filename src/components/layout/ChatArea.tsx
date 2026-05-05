import { useEffect, useRef, useLayoutEffect, useMemo, useState, useCallback } from "react";
import {
  Users,
  MoreVertical,
  Trash2,
  LogOut,
  User,
  Menu,
  Settings,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { usePresence } from "@/hooks/usePresence";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import { useReactions } from "@/hooks/useReactions";
import { useGroupRole } from "@/hooks/useGroupRole";
import { useAdminRole } from "@/hooks/useAdminRole";
import { usePinnedMessages } from "@/hooks/usePinnedMessages";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { PinnedMessagesBar } from "@/components/PinnedMessagesBar";
import { ScrollToBottomButton } from "@/components/ScrollToBottomButton";
import { ResetGroupPasswordModal } from "@/components/ResetGroupPasswordModal";
import { useThemeContext } from "./ThemeProvider";
import { toast } from "sonner";

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  has_password: boolean;
}

interface ChatAreaProps {
  groupId: string | null;
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
  onOpenMembers: () => void;
  showMembersPanel: boolean;
  isMobile: boolean;
}

export function ChatArea({
  groupId,
  onOpenSidebar,
  onOpenSettings,
  onOpenMembers,
  showMembersPanel,
  isMobile,
}: ChatAreaProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { wallpaper, getWallpaperStyle } = useThemeContext();
  const { 
    messages, 
    loading: messagesLoading, 
    sendMessage, 
    editMessage,
    deleteForMe,
    deleteForEveryone,
    canDeleteForEveryone,
  } = useMessages(groupId);
  const { members } = useGroupMembers(groupId);
  const { typingUsers, onlineCount, startTyping } = usePresence(groupId);
  const { isAdmin, canSendMessages } = useGroupRole(groupId);
  const { isSuperAdmin } = useAdminRole();

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { readReceipts, markAllAsRead } = useReadReceipts(groupId, messageIds);
  const { toggleReaction, getReactionGroups } = useReactions(groupId, messageIds);
  const { pinMessage, unpinMessage, isMessagePinned } = usePinnedMessages(groupId);

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const prevMessageCountRef = useRef(messages.length);

  const isOwner = group?.created_by === user?.id;

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      return;
    }

    const fetchGroup = async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error || !data) {
        setGroup(null);
        return;
      }

      setGroup(data);
    };

    fetchGroup();
  }, [groupId]);

  // Handle scroll to bottom and track unread - RAF throttled
  const rafRef = useRef<number | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
    scrollViewportRef.current = viewport;
    if (!viewport) return;

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        setShowScrollButton(distanceFromBottom > 200);
        if (distanceFromBottom < 50) {
          setUnreadBelowCount(0);
        }
      });
    };

    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [groupId]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadBelowCount(0);
  }, []);

  // Track new messages while scrolled up
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && showScrollButton) {
      setUnreadBelowCount((prev) => prev + (messages.length - prevMessageCountRef.current));
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, showScrollButton]);

  useLayoutEffect(() => {
    if (!showScrollButton) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }
    if (messages.length > 0) {
      markAllAsRead();
    }
  }, [messages.length, showScrollButton]);

  const handleSendMessage = async (
    content: string,
    fileUrl?: string,
    fileType?: string,
    fileName?: string
  ) => {
    return sendMessage(content, fileUrl, fileType, fileName);
  };

  const handleLeave = async () => {
    if (!groupId || !user) return;

    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    toast.success("Left the group");
    navigate("/");
  };

  const handleDeleteGroup = async () => {
    if (!groupId || !user || !isOwner) return;

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("created_by", user.id);

    if (error) {
      toast.error("Failed to delete group");
      return;
    }

    toast.success("Group deleted successfully");
    navigate("/");
  };

  const handlePinMessage = async (messageId: string) => {
    if (isMessagePinned(messageId)) {
      await unpinMessage(messageId);
    } else {
      await pinMessage(messageId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].username} is typing...`;
    if (typingUsers.length === 2)
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  // Empty state - no group selected
  if (!groupId || !group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="text-center p-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Welcome to ChatSpace
          </h2>
          <p className="text-muted-foreground max-w-sm">
            Select a group from the sidebar to start chatting, or create a new group to get
            started.
          </p>
          {isMobile && (
            <Button onClick={onOpenSidebar} className="mt-6 rounded-full" size="lg">
              <Menu className="w-5 h-5 mr-2" />
              Open Groups
            </Button>
          )}
        </div>
      </div>
    );
  }

  const wallpaperStyle = getWallpaperStyle();

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/", { replace: true });
                }
              }}
              className="hover:bg-accent rounded-full min-w-[40px] min-h-[40px] relative z-30"
              style={{ touchAction: "manipulation" }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10 border-2 border-primary/30">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-foreground truncate">{group.name}</h1>
              {typingUsers.length > 0 ? (
                <p className="text-xs text-primary animate-pulse font-medium truncate">
                  {getTypingText()}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground truncate">
                  {onlineCount > 0 ? `${onlineCount} online • ` : ""}
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isSuperAdmin && group.has_password && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowResetPasswordModal(true)}
                className="hover:bg-accent rounded-full text-primary"
                title="Reset Group Password"
              >
                <KeyRound className="w-5 h-5" />
              </Button>
            )}
            {isSuperAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onOpenMembers}
                className="hover:bg-accent rounded-full text-primary"
                title="Admin Settings"
              >
                <ShieldCheck className="w-5 h-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenMembers}
              className={`hover:bg-accent rounded-full ${showMembersPanel ? "bg-accent" : ""}`}
            >
              <Users className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenSettings}
              className="hover:bg-accent rounded-full"
            >
              <Settings className="w-5 h-5" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-accent rounded-full">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLeave}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave group
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete group
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Pinned Messages */}
      <PinnedMessagesBar groupId={groupId} isAdmin={isAdmin} />

      {/* Messages Area with Wallpaper */}
      <div
        className="flex-1 flex flex-col relative overflow-hidden"
        style={{ backgroundColor: "hsl(var(--background))" }}
      >
        {/* Wallpaper Layer */}
        {wallpaper.type !== "none" && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-500"
            style={{
              ...wallpaperStyle,
              opacity: wallpaper.opacity / 100,
            }}
          />
        )}

        <ScrollArea className="flex-1 p-4 relative z-10" ref={scrollAreaRef}>
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground font-medium">No messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Send a message to start the conversation
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message, index) => {
                  const isOwnMessage = message.user_id === user?.id;
                  const showAvatar =
                    index === 0 || messages[index - 1]?.user_id !== message.user_id;
                  const showName =
                    !isOwnMessage &&
                    (index === 0 || messages[index - 1]?.user_id !== message.user_id);

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={isOwnMessage}
                      showAvatar={showAvatar}
                      showName={showName}
                      readReceipts={readReceipts[message.id] || []}
                      currentUserId={user?.id}
                      onEdit={editMessage}
                      onReact={toggleReaction}
                      onPin={handlePinMessage}
                      onDeleteForMe={deleteForMe}
                      onDeleteForEveryone={deleteForEveryone}
                      canDeleteForEveryone={canDeleteForEveryone}
                      reactionGroups={getReactionGroups(message.id)}
                      isPinned={isMessagePinned(message.id)}
                      isAdmin={isAdmin}
                    />
                  );
                })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        <ScrollToBottomButton
          show={showScrollButton}
          unreadCount={unreadBelowCount}
          onClick={scrollToBottom}
        />

        {/* Chat Input */}
        <div className="relative z-10 bg-card/80 backdrop-blur-sm border-t border-border">
          {canSendMessages ? (
            <ChatInput onSend={handleSendMessage} onTyping={startTyping} />
          ) : (
            <div className="p-4 flex items-center justify-center gap-2 text-muted-foreground">
              <ShieldAlert className="w-5 h-5" />
              <span className="text-sm">Only admins can send messages in this group</span>
            </div>
          )}
        </div>
      </div>

      {/* Reset Group Password Modal */}
      {groupId && (
        <ResetGroupPasswordModal
          open={showResetPasswordModal}
          onOpenChange={setShowResetPasswordModal}
          groupId={groupId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{group.name}"? This action cannot be undone.
              All messages and members will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
