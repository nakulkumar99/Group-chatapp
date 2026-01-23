import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCheck, Download, FileText, Play, Image as ImageIcon, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    file_url?: string | null;
    file_type?: string | null;
    file_name?: string | null;
    profile?: {
      username: string;
      avatar_url: string | null;
    };
  };
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar, showName }: MessageBubbleProps) {
  const [imagePreview, setImagePreview] = useState(false);

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

  const isImage = message.file_type?.startsWith("image/");
  const isVideo = message.file_type?.startsWith("video/");
  const isAudio = message.file_type?.startsWith("audio/");
  const isDocument = message.file_type && !isImage && !isVideo && !isAudio;

  const handleDownload = async () => {
    if (!message.file_url) return;
    
    try {
      const response = await fetch(message.file_url);
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
      window.open(message.file_url, "_blank");
    }
  };

  const renderFileContent = () => {
    if (!message.file_url) return null;

    if (isImage) {
      return (
        <>
          <div 
            className="relative cursor-pointer rounded-lg overflow-hidden mb-1"
            onClick={() => setImagePreview(true)}
          >
            <img
              src={message.file_url}
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
                  src={message.file_url}
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
            src={message.file_url}
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
        <div className="flex items-center gap-3 bg-black/10 rounded-full px-4 py-2 mb-1">
          <div className="w-10 h-10 rounded-full bg-[hsl(149,67%,38%)] flex items-center justify-center">
            <Play className="w-5 h-5 text-white" fill="white" />
          </div>
          <audio
            src={message.file_url}
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
          className="flex items-center gap-3 bg-black/10 rounded-xl px-4 py-3 mb-1 cursor-pointer hover:bg-black/20 transition-colors"
          onClick={handleDownload}
        >
          <div className="w-10 h-10 rounded-lg bg-[hsl(149,67%,38%)] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-white" />
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

  return (
    <motion.div
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
            isOwn ? "message-bubble-own" : "message-bubble-other"
          }`}
        >
          {renderFileContent()}
          {message.content && (
            <p className={`text-sm break-words ${message.file_url ? "" : "pr-12"}`}>
              {message.content}
            </p>
          )}
          <span className={`absolute bottom-1 right-2 text-[10px] flex items-center gap-1 ${isOwn ? "text-white/60" : "text-muted-foreground"}`}>
            {formatTime(message.created_at)}
            {isOwn && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
