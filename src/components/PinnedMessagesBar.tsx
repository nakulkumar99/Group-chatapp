import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePinnedMessages } from "@/hooks/usePinnedMessages";

interface PinnedMessagesBarProps {
  groupId: string;
  isAdmin: boolean;
}

export function PinnedMessagesBar({ groupId, isAdmin }: PinnedMessagesBarProps) {
  const { pinnedMessages, unpinMessage } = usePinnedMessages(groupId);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (pinnedMessages.length === 0) {
    return null;
  }

  const currentMessage = pinnedMessages[currentIndex];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : pinnedMessages.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < pinnedMessages.length - 1 ? prev + 1 : 0));
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-primary/10 border-b border-primary/20"
    >
      <div className="px-4 py-2">
        <div className="flex items-center gap-3">
          <Pin className="w-4 h-4 text-primary shrink-0" />
          
          {pinnedMessages.length > 1 && (
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={handlePrev}
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0"
                onClick={handleNext}
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
          )}

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary">
                Pinned Message {pinnedMessages.length > 1 && `${currentIndex + 1}/${pinnedMessages.length}`}
              </span>
              <span className="text-xs text-muted-foreground">
                by {currentMessage.message?.profile?.username || "Unknown"}
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={currentMessage.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className={`text-sm text-foreground ${expanded ? "" : "truncate"}`}
              >
                {currentMessage.message?.content || "Message unavailable"}
              </motion.p>
            </AnimatePresence>
          </div>

          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 hover:bg-destructive/20 hover:text-destructive"
              onClick={() => unpinMessage(currentMessage.message_id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
