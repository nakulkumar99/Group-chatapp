import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Smile, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const QUICK_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "🙏"];

const ALL_EMOJIS = [
  "❤️", "👍", "😂", "😮", "😢", "🙏",
  "🔥", "🎉", "👏", "💯", "🤔", "😍",
  "👎", "😡", "🤯", "💀", "🙌", "✨",
];

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiReactionPicker({ onSelect, className = "" }: EmojiReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
    setShowAll(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 rounded-full hover:bg-accent ${className}`}
        >
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-2 bg-popover/95 backdrop-blur-sm border border-border shadow-xl"
        align="start"
        side="top"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-wrap gap-1 max-w-[200px]"
        >
          <AnimatePresence mode="popLayout">
            {(showAll ? ALL_EMOJIS : QUICK_EMOJIS).map((emoji, index) => (
              <motion.button
                key={emoji}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => handleSelect(emoji)}
                className="w-8 h-8 text-lg flex items-center justify-center hover:bg-accent rounded-md transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
            {!showAll && (
              <motion.button
                key="more"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setShowAll(true)}
                className="w-8 h-8 flex items-center justify-center hover:bg-accent rounded-md transition-colors text-muted-foreground"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </PopoverContent>
    </Popover>
  );
}

interface ReactionDisplayProps {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: Array<{ username: string }>;
  onClick: () => void;
}

export function ReactionDisplay({ emoji, count, hasReacted, users, onClick }: ReactionDisplayProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
        hasReacted
          ? "bg-primary/20 border border-primary/40 hover:bg-primary/30"
          : "bg-accent/50 border border-transparent hover:bg-accent"
      }`}
      title={users.map((u) => u.username).join(", ")}
    >
      <span>{emoji}</span>
      <span className="font-medium">{count}</span>
    </button>
  );
}
