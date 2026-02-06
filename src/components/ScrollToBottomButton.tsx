import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScrollToBottomButtonProps {
  show: boolean;
  unreadCount: number;
  onClick: () => void;
}

export function ScrollToBottomButton({
  show,
  unreadCount,
  onClick,
}: ScrollToBottomButtonProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-20 right-4 z-20"
        >
          <Button
            onClick={onClick}
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg bg-primary hover:bg-primary/90 relative"
          >
            <ArrowDown className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
