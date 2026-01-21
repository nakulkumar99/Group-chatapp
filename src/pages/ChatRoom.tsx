import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Send,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMessages } from "@/hooks/useMessages";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { supabase } from "@/integrations/supabase/client";
import { messageSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRef, useLayoutEffect } from "react";
import { toast } from "sonner";

interface GroupInfo {
  id: string;
  name: string;
  description: string | null;
}

export default function ChatRoom() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { messages, loading: messagesLoading, sendMessage } = useMessages(groupId || null);
  const { members, loading: membersLoading } = useGroupMembers(groupId || null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const { error } = await sendMessage(newMessage.trim());
    if (!error) {
      setNewMessage("");
    }
    setSending(false);
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

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="hover:bg-accent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg text-foreground">{group.name}</h1>
              <p className="text-xs text-muted-foreground">
                {members.length} member{members.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMembers(!showMembers)}
              className="hover:bg-accent md:hidden"
            >
              {showMembers ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMembers(!showMembers)}
              className="hover:bg-accent hidden md:flex"
            >
              <Users className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLeave}
              className="hover:bg-destructive/20 text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-pulse text-muted-foreground">
                  Loading messages...
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No messages yet. Start the conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((message, index) => {
                    const isOwn = message.user_id === user?.id;
                    const showAvatar =
                      index === 0 ||
                      messages[index - 1]?.user_id !== message.user_id;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                      >
                        {showAvatar ? (
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {getInitials(message.profile?.username || "U")}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 shrink-0" />
                        )}
                        <div
                          className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}
                        >
                          {showAvatar && !isOwn && (
                            <p className="text-xs text-muted-foreground mb-1 ml-1">
                              {message.profile?.username || "Unknown"}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2 ${
                              isOwn
                                ? "message-bubble-own"
                                : "message-bubble-other"
                            }`}
                          >
                            <p className="text-sm break-words">{message.content}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 mx-1">
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-background">
            <form onSubmit={handleSend} className="flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-12 bg-secondary border-border focus:border-primary"
                maxLength={1000}
              />
              <Button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="h-12 w-12 btn-twitter p-0"
              >
                <Send className="w-5 h-5" />
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
                <h2 className="font-semibold text-foreground mb-4">Members</h2>
                {membersLoading ? (
                  <div className="animate-pulse text-muted-foreground text-sm">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      >
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(member.profile?.username || "U")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {member.profile?.username || "Unknown"}
                          </p>
                          {member.user_id === user?.id && (
                            <span className="text-xs text-primary">You</span>
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
    </div>
  );
}
