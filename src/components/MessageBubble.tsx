import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useSignedUrl } from "@/hooks/useSignedUrl";
import { CheckCheck, Download, FileText, Play, Image as ImageIcon, X, Pencil, Check, Pin, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ReadReceiptAvatars } from "./ReadReceiptAvatars";
import { EmojiReactionPicker, ReactionDisplay } from "./EmojiReactionPicker";

interface ReadReceipt {
  id: string;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ReactionGroup {
  emoji: string;
  count: number;
  users: Array<{ username: string }>;
  hasReacted: boolean;
}

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    file_url?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    edited_at?: string | null;
    deleted_at?: string | null;
    deleted_for_everyone?: boolean;
    profile?: {
      username: string;
      avatar_url: string | null;
    };
  };
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
  readReceipts?: ReadReceipt[];
  currentUserId?: string;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onDeleteForEveryone?: (messageId: string) => void;
  canDeleteForEveryone?: (createdAt: string) => boolean;
  reactionGroups?: ReactionGroup[];
  isPinned?: boolean;
  isAdmin?: boolean;
}

export function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar, 
  showName, 
  readReceipts = [], 
  currentUserId, 
  onEdit,
  onReact,
  onPin,
  onDeleteForMe,
  onDeleteForEveryone,
  canDeleteForEveryone,
  reactionGroups = [],
  isPinned = false,
  isAdmin = false,
}: MessageBubbleProps) {
  const [imagePreview, setImagePreview] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { signedUrl } = useSignedUrl(message.file_url);

  // Check if message is deleted for everyone
  const isDeletedForEveryone = message.deleted_at && message.deleted_for_everyone;

  // Keep actions visible when dropdown is open
  const actionsVisible = showActions || dropdownOpen;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formattedTime = useMemo(
    () =>
      new Date(message.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [message.created_at]
  );


  const isImage = message.file_type?.startsWith("image/");
  const isVideo = message.file_type?.startsWith("video/");
  const isAudio = message.file_type?.startsWith("audio/");
  const isDocument = message.file_type && !isImage && !isVideo && !isAudio;

  const handleDownload = async () => {
    if (!signedUrl) return;
    
    try {
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = message.file_name || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(signedUrl, "_blank");
    }
  };

  const handleSaveEdit = async () => {
    if (!onEdit || editContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    await onEdit(message.id, editContent.trim());
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const handleDeleteForMe = () => {
    // Instant delete for me - no confirmation needed (WhatsApp-like)
    onDeleteForMe?.(message.id);
  };

  const handleDeleteForEveryoneClick = () => {
    // Show confirmation only for "delete for everyone"
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = () => {
    onDeleteForEveryone?.(message.id);
    setShowDeleteDialog(false);
  };

  const renderFileContent = () => {
    if (!signedUrl) return null;

    if (isImage) {
      return (
        <>
          <div 
            className="relative cursor-pointer rounded-lg overflow-hidden mb-1"
            onClick={() => setImagePreview(true)}
          >
            <img
              src={signedUrl}
              alt={message.file_name || "Image"}
              className="max-w-full max-h-64 rounded-lg object-cover hover:opacity-90 transition-opacity"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <Dialog open={imagePreview} onOpenChange={setImagePreview}>
            <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full z-10"
                  onClick={() => setImagePreview(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
                <img
                  src={signedUrl}
                  alt={message.file_name || "Image"}
                  className="max-w-full max-h-[80vh] rounded-lg object-contain mx-auto"
                />
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    if (isVideo) {
      return (
        <div className="relative rounded-lg overflow-hidden mb-1 max-w-sm">
          <video
            src={signedUrl}
            controls
            className="max-w-full max-h-64 rounded-lg"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="flex items-center gap-3 bg-accent/30 rounded-full px-4 py-2 mb-1">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground" fill="currentColor" />
          </div>
          <audio
            src={signedUrl}
            controls
            className="h-8 flex-1"
            style={{ maxWidth: "200px" }}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (isDocument) {
      return (
        <div 
          className="flex items-center gap-3 bg-accent/30 rounded-xl px-4 py-3 mb-1 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={handleDownload}
        >
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-foreground">
              {message.file_name || "Document"}
            </p>
            <p className="text-xs text-muted-foreground">
              {message.file_type?.split("/")[1]?.toUpperCase() || "FILE"}
            </p>
          </div>
          <Download className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      );
    }

    return null;
  };

  // Render deleted message placeholder
  if (isDeletedForEveryone) {
    return (
      <div
        className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
      >
        {!isOwn && showAvatar && (
          <Avatar className="w-8 h-8 shrink-0 mt-auto">
            {message.profile?.avatar_url ? (
              <AvatarImage src={message.profile.avatar_url} alt={message.profile.username} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(message.profile?.username || "U")}
            </AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}
        <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
          {showName && (
            <p className="text-xs text-primary mb-1 ml-2 font-medium">
              {message.profile?.username || "Unknown"}
            </p>
          )}
          <div
            className={`px-3 py-2 rounded-2xl border border-border bg-muted/30`}
          >
            <p className="text-sm text-muted-foreground italic flex items-center gap-2">
              🚫 This message was deleted
            </p>
            <span className="text-[10px] text-muted-foreground/60 block text-right mt-1">
              {formattedTime}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Only use hover handlers on devices that support hover
  const supportsHover = typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

  return (
    <>
      <div
        className={`flex gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
        onMouseEnter={supportsHover ? () => setShowActions(true) : undefined}
        onMouseLeave={supportsHover ? () => setShowActions(false) : undefined}
      >
        {!isOwn && showAvatar && (
          <Avatar className="w-8 h-8 shrink-0 mt-auto">
            {message.profile?.avatar_url ? (
              <AvatarImage src={message.profile.avatar_url} alt={message.profile.username} />
            ) : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(message.profile?.username || "U")}
            </AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}
        <div className={`max-w-[85%] sm:max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
          {showName && (
            <p className="text-xs text-primary mb-1 ml-2 font-medium">
              {message.profile?.username || "Unknown"}
            </p>
          )}
          <div
            className={`relative group ${actionsVisible && !isEditing ? "mt-8" : ""}`}
            onClick={!supportsHover ? () => setShowActions((v) => !v) : undefined}
          >
            {/* Action buttons */}
            {actionsVisible && !isEditing && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`absolute -top-8 flex items-center gap-1 z-30 bg-popover/95 backdrop-blur-sm border border-border rounded-full px-1 py-0.5 shadow-md ${
                  isOwn ? "right-0" : "left-0"
                }`}
              >
                {onReact && (
                  <EmojiReactionPicker onSelect={(emoji) => onReact(message.id, emoji)} />
                )}
                {isOwn && message.content && !message.file_url && onEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full hover:bg-accent"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isAdmin && onPin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 rounded-full hover:bg-accent ${isPinned ? "text-primary" : ""}`}
                    onClick={() => onPin(message.id)}
                  >
                    <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
                  </Button>
                )}
                {/* Delete button for own messages */}
                {isOwn && (onDeleteForMe || onDeleteForEveryone) && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-full hover:bg-accent hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52" sideOffset={5}>
                      {onDeleteForMe && (
                        <DropdownMenuItem 
                          onClick={() => {
                            setDropdownOpen(false);
                            handleDeleteForMe();
                          }}
                          className="cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete for me
                        </DropdownMenuItem>
                      )}
                      {onDeleteForEveryone && canDeleteForEveryone?.(message.created_at) && (
                        <DropdownMenuItem
                          onClick={() => {
                            setDropdownOpen(false);
                            handleDeleteForEveryoneClick();
                          }}
                          className="text-destructive focus:text-destructive cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete for everyone
                        </DropdownMenuItem>
                      )}
                      {onDeleteForEveryone && !canDeleteForEveryone?.(message.created_at) && (
                        <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                          Delete for everyone expired (5 min limit)
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </motion.div>
            )}

            <div
              className={`px-3 py-2 relative ${
                isOwn ? "message-bubble-own" : "message-bubble-other"
              }`}
            >
              {/* Pinned indicator */}
              {isPinned && (
                <div className="absolute -top-2 -right-2">
                  <Pin className="w-3 h-3 text-primary fill-current" />
                </div>
              )}

              {renderFileContent()}
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="text-sm bg-transparent border-border text-inherit h-8"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveEdit}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancelEdit}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {message.content && (
                    <p className={`text-sm break-words ${message.file_url ? "" : "pr-12"}`}>
                      {message.content}
                    </p>
                  )}
                </>
              )}
              <span className={`absolute bottom-1 right-2 text-[10px] flex items-center gap-1 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                {message.edited_at && <span className="italic">edited</span>}
                {formattedTime}
                {isOwn && <CheckCheck className={`w-3.5 h-3.5 ${readReceipts.length > 0 ? "text-sky-400" : "text-primary-foreground/40"}`} />}
              </span>
            </div>

            {/* Reactions display */}
            {reactionGroups.length > 0 && (
              <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}>
                {reactionGroups.map((group) => (
                  <ReactionDisplay
                    key={group.emoji}
                    emoji={group.emoji}
                    count={group.count}
                    hasReacted={group.hasReacted}
                    users={group.users}
                    onClick={() => onReact?.(message.id, group.emoji)}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Read receipts - only show for own messages */}
          {isOwn && readReceipts.length > 0 && (
            <div className="flex justify-end">
              <ReadReceiptAvatars
                receipts={readReceipts}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Delete for Everyone Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete for everyone?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be deleted for all members in this chat. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete for everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
