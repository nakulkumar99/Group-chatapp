import { motion } from "framer-motion";
import { Mic, Square, Trash2, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  isSending?: boolean;
  voiceRecorder: {
    isRecording: boolean;
    recordingDuration: number;
    stopRecording: () => Promise<Blob | null>;
    cancelRecording: () => void;
  };
}

export function VoiceRecorder({ onRecordingComplete, onCancel, isSending = false, voiceRecorder }: VoiceRecorderProps) {
  const { isRecording, recordingDuration, stopRecording, cancelRecording } = voiceRecorder;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStop = async () => {
    const blob = await stopRecording();
    if (blob) {
      onRecordingComplete(blob);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-3 w-full px-4"
    >
      {/* Cancel Button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 rounded-full hover:bg-destructive/20 text-destructive"
        onClick={handleCancel}
        disabled={isSending}
      >
        <Trash2 className="w-5 h-5" />
      </Button>

      {/* Recording Indicator */}
      <div className="flex-1 flex items-center gap-3 bg-[hsl(203,23%,18%)] rounded-full px-4 py-2">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="w-3 h-3 rounded-full bg-red-500"
        />
        <span className="text-sm font-medium text-foreground">
          {formatDuration(recordingDuration)}
        </span>

        {/* Audio Waveform Animation */}
        <div className="flex items-center gap-0.5 flex-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              animate={{
                height: isRecording ? [4, Math.random() * 16 + 4, 4] : 4,
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                delay: i * 0.05,
              }}
              className="w-1 bg-primary rounded-full"
              style={{ minHeight: 4 }}
            />
          ))}
        </div>

        {isRecording && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-accent"
            onClick={handleStop}
            disabled={isSending}
          >
            <Square className="w-4 h-4 fill-current" />
          </Button>
        )}
      </div>

      {/* Send Button */}
      <Button
        type="button"
        onClick={handleStop}
        disabled={!isRecording || isSending}
        className="h-11 w-11 rounded-full bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)] p-0 shadow-lg disabled:opacity-50"
      >
        {isSending ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Send className="w-5 h-5 text-white" />
        )}
      </Button>
    </motion.div>
  );
}

interface VoiceRecorderButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function VoiceRecorderButton({ onClick, disabled }: VoiceRecorderButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-11 w-11 rounded-full hover:bg-[hsl(203,23%,22%)] text-muted-foreground"
      onClick={onClick}
      disabled={disabled}
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}
