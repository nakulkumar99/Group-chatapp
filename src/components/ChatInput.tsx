import { useState, useRef } from "react";
import { Send, Paperclip, X, Image, FileText, Loader2, Mic } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFileUpload } from "@/hooks/useFileUpload";
import { VoiceRecorder, VoiceRecorderButton } from "@/components/VoiceRecorder";
import { toast } from "sonner";

interface ChatInputProps {
  onSend: (content: string, fileUrl?: string, fileType?: string, fileName?: string) => Promise<{ error: Error | null }>;
  onTyping: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onTyping, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !selectedFile) return;

    setSending(true);

    try {
      let fileUrl: string | undefined;
      let fileType: string | undefined;
      let fileName: string | undefined;

      if (selectedFile) {
        const result = await uploadFile(selectedFile);
        if (result) {
          fileUrl = result.url;
          fileType = result.fileType;
          fileName = result.fileName;
        } else {
          setSending(false);
          return;
        }
      }

      const { error } = await onSend(message.trim(), fileUrl, fileType, fileName);
      
      if (!error) {
        setMessage("");
        clearFile();
      }
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      onTyping();
    }
  };

  const handleVoiceRecordingComplete = async (blob: Blob) => {
    setSendingVoice(true);
    try {
      const extension = blob.type.includes("webm") ? "webm" : "mp4";
      const file = new File([blob], `voice-message-${Date.now()}.${extension}`, {
        type: blob.type,
      });

      const result = await uploadFile(file);
      if (result) {
        await onSend("", result.url, result.fileType, result.fileName);
      }
    } finally {
      setSendingVoice(false);
      setIsRecording(false);
    }
  };

  const isImage = selectedFile?.type.startsWith("image/");
  const isSubmitDisabled = sending || uploading || disabled || (!message.trim() && !selectedFile);

  return (
    <div className="p-3 bg-transparent">
      {/* File Preview */}
      {selectedFile && (
        <div className="mb-3 px-2">
          <div className="bg-[hsl(203,23%,18%)] rounded-xl p-3 flex items-center gap-3 max-w-sm">
            {previewUrl && isImage ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center shrink-0">
                {isImage ? (
                  <Image className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <FileText className="w-6 h-6 text-primary-foreground" />
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
              onClick={clearFile}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {isRecording ? (
          <VoiceRecorder
            key="voice-recorder"
            onRecordingComplete={handleVoiceRecordingComplete}
            onCancel={() => setIsRecording(false)}
            isSending={sendingVoice}
          />
        ) : (
          <form key="text-input" onSubmit={handleSubmit} className="flex gap-2 items-center">
            {/* File Attachment Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full hover:bg-accent text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || sending}
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            {/* Message Input */}
            <Input
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message"
              className="flex-1 h-11 rounded-full bg-muted border-0 focus:ring-1 focus:ring-primary px-4"
              maxLength={1000}
              disabled={uploading || sending}
            />

            {/* Voice Recording Button - show when no text */}
            {!message.trim() && !selectedFile && (
              <VoiceRecorderButton
                onClick={() => setIsRecording(true)}
                disabled={uploading || sending || disabled}
              />
            )}

            {/* Send Button */}
            {(message.trim() || selectedFile) && (
              <Button
                type="submit"
                disabled={isSubmitDisabled}
                className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 p-0 shadow-lg disabled:opacity-50"
              >
                {uploading || sending ? (
                  <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                ) : (
                  <Send className="w-5 h-5 text-primary-foreground" />
                )}
              </Button>
            )}
          </form>
        )}
      </AnimatePresence>
    </div>
  );
}
