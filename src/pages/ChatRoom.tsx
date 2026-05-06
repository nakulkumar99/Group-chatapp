import { useEffect, useState, useRef, useLayoutEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  MoreVertical,
  Trash2,
  LogOut,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { usePresence } from "@/hooks/usePresence";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from "sonner";

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
}

export default function ChatRoom() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loading: messagesLoading, sendMessage, editMessage } = useMessages(groupId || null);
  const { members, loading: membersLoading } = useGroupMembers(groupId || null);
  const { typingUsers, onlineCount, startTyping, isUserOnline, isUserTyping } = usePresence(groupId || null);
  
  // Get message IDs for read receipts
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { readReceipts, markAllAsRead } = useReadReceipts(groupId || null, messageIds);
  
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = group?.created_by === user?.id;

  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (error || !data) {
        toast.error("Group not found");
        navigate("/");
        return;
      }

      setGroup(data);
    };

    fetchGroup();
  }, [groupId, navigate]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Mark messages as read when viewing
    if (messages.length > 0) {
      markAllAsRead();
    }
  }, [messages, markAllAsRead]);

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
    if (typingUsers.length === 2) return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* WhatsApp-style Header */}
      <header className="sticky top-0 z-20 bg-[hsl(174,57%,26%)] shadow-lg">
        <div className="w-full px-4 h-16 flex items-center justify-between">
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
              className="hover:bg-white/10 text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar className="w-10 h-10 border-2 border-white/20">
              <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white font-bold">
                {getInitials(group.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="font-semibold text-white">{group.name}</h1>
              {typingUsers.length > 0 ? (
                <p className="text-xs text-[hsl(149,67%,60%)] animate-pulse font-medium">
                  {getTypingText()}
                </p>
              ) : (
                <p className="text-xs text-white/70">
                  {onlineCount > 0 ? `${onlineCount} online • ` : ""}{members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMembers(!showMembers)}
              className="hover:bg-white/10 text-white"
            >
              <Users className="w-5 h-5" />
            </Button>
            
            {/* Exit button - always visible on desktop (md and up) */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeave}
              className="hidden md:inline-flex items-center gap-1.5 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <LogOut className="w-4 h-4" />
              Exit
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <DropdownMenuItem onClick={() => setShowMembers(!showMembers)}>
                  <Users className="w-4 h-4 mr-2" />
                  {showMembers ? "Hide members" : "View members"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Leave group - visible in dropdown on mobile only */}
                <DropdownMenuItem onClick={handleLeave} className="md:hidden text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Leave group
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
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

      <div className="flex-1 flex overflow-hidden w-full">
        {/* Messages Area - WhatsApp style background */}
        <div 
          className="flex-1 flex flex-col"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23334155' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundColor: "hsl(var(--background))",
          }}
        >
          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">
                  Loading messages...
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-20 h-20 rounded-full bg-[hsl(149,67%,38%)]/20 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-[hsl(149,67%,38%)]" />
                </div>
                <p className="text-muted-foreground font-medium">
                  No messages yet
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Send a message to start the conversation
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => {
                    const isOwnMessage = message.user_id === user?.id;
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1]?.user_id !== message.user_id;
                    const showName =
                      !isOwnMessage &&
                      (index === 0 ||
                        messages[index - 1]?.user_id !== message.user_id);

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
                        />
                      );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* WhatsApp-style Message Input */}
          <ChatInput
            onSend={handleSendMessage}
            onTyping={startTyping}
          />
        </div>

        {/* Members Sidebar */}
        <AnimatePresence>
          {showMembers && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border bg-sidebar overflow-hidden"
            >
              <div className="p-4">
                <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[hsl(149,67%,38%)]" />
                  Members ({members.length})
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[hsl(142,76%,45%)]"></span>
                    {onlineCount} online
                  </span>
                </p>
                {membersLoading ? (
                  <div className="animate-pulse text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => {
                      const memberIsOnline = isUserOnline(member.user_id);
                      const memberIsTyping = isUserTyping(member.user_id);
                      
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white">
                                {getInitials(member.profile?.username || "U")}
                              </AvatarFallback>
                            </Avatar>
                            {/* Online indicator */}
                            <span 
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar ${
                                memberIsOnline ? "bg-[hsl(142,76%,45%)]" : "bg-muted-foreground/50"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {member.profile?.username || "Unknown"}
                            </p>
                            {memberIsTyping ? (
                              <span className="text-xs text-[hsl(149,67%,45%)] animate-pulse">typing...</span>
                            ) : member.user_id === group?.created_by ? (
                              <span className="text-xs text-[hsl(149,67%,45%)]">Admin</span>
                            ) : member.user_id === user?.id ? (
                              <span className="text-xs text-muted-foreground">You</span>
                            ) : memberIsOnline ? (
                              <span className="text-xs text-[hsl(142,76%,45%)]">Online</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Offline</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

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
