import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Send,
  MoreVertical,
  Trash2,
  LogOut,
  Check,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { messageSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { messages, loading: messagesLoading, sendMessage } = useMessages(groupId || null);
  const { members, loading: membersLoading } = useGroupMembers(groupId || null);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(groupId || null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
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
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = messageSchema.safeParse({ content: newMessage });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || "Invalid message");
      return;
    }

    setSending(true);
    stopTyping();
    const { error } = await sendMessage(newMessage.trim());
    if (!error) {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim()) {
      startTyping();
    }
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

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
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
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMembers(!showMembers)}
              className="hover:bg-white/10 text-white"
            >
              <Users className="w-5 h-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-white/10 text-white">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowMembers(!showMembers)}>
                  <Users className="w-4 h-4 mr-2" />
                  {showMembers ? "Hide members" : "View members"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLeave} className="text-destructive focus:text-destructive">
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

      <div className="flex-1 flex overflow-hidden max-w-4xl mx-auto w-full">
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
                    const isOwn = message.user_id === user?.id;
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1]?.user_id !== message.user_id;
                    const showName =
                      !isOwn &&
                      (index === 0 ||
                        messages[index - 1]?.user_id !== message.user_id);

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        {!isOwn && showAvatar && (
                          <Avatar className="w-8 h-8 shrink-0 mt-auto">
                            <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white text-xs">
                              {getInitials(message.profile?.username || "U")}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}
                        <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                          {showName && (
                            <p className="text-xs text-[hsl(149,67%,45%)] mb-1 ml-2 font-medium">
                              {message.profile?.username || "Unknown"}
                            </p>
                          )}
                          <div
                            className={`px-3 py-2 relative ${
                              isOwn
                                ? "message-bubble-own"
                                : "message-bubble-other"
                            }`}
                          >
                            <p className="text-sm break-words pr-12">{message.content}</p>
                            <span className="absolute bottom-1 right-2 text-[10px] text-white/60 flex items-center gap-1">
                              {formatTime(message.created_at)}
                              {isOwn && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* WhatsApp-style Message Input */}
          <div className="p-3 bg-[hsl(200,18%,13%)]">
            <form onSubmit={handleSend} className="flex gap-2 items-center">
              <Input
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message"
                className="flex-1 h-11 rounded-full bg-[hsl(203,23%,18%)] border-0 focus:ring-1 focus:ring-[hsl(149,67%,38%)] px-4"
                maxLength={1000}
              />
              <Button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="h-11 w-11 rounded-full bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)] p-0 shadow-lg"
              >
                <Send className="w-5 h-5 text-white" />
              </Button>
            </form>
          </div>
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
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[hsl(149,67%,38%)]" />
                  Members ({members.length})
                </h2>
                {membersLoading ? (
                  <div className="animate-pulse text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white">
                            {getInitials(member.profile?.username || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {member.profile?.username || "Unknown"}
                          </p>
                          {member.user_id === group?.created_by && (
                            <span className="text-xs text-[hsl(149,67%,45%)]">Admin</span>
                          )}
                          {member.user_id === user?.id && member.user_id !== group?.created_by && (
                            <span className="text-xs text-muted-foreground">You</span>
                          )}
                        </div>
                      </div>
                    ))}
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
