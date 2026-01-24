import { useState, useRef } from "react";
import { Send, Paperclip, X, Image, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFileUpload } from "@/hooks/useFileUpload";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading } = useFileUpload();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
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

      // Upload file if selected
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
              <div className="w-12 h-12 rounded-lg bg-[hsl(149,67%,38%)] flex items-center justify-center shrink-0">
                {isImage ? (
                  <Image className="w-6 h-6 text-white" />
                ) : (
                  <FileText className="w-6 h-6 text-white" />
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

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
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
          className="h-11 w-11 rounded-full hover:bg-[hsl(203,23%,22%)] text-muted-foreground"
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
          className="flex-1 h-11 rounded-full bg-[hsl(203,23%,18%)] border-0 focus:ring-1 focus:ring-[hsl(149,67%,38%)] px-4"
          maxLength={1000}
          disabled={uploading || sending}
        />

        {/* Send Button */}
        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="h-11 w-11 rounded-full bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)] p-0 shadow-lg disabled:opacity-50"
        >
          {uploading || sending ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </Button>
      </form>
    </div>
  );
}
