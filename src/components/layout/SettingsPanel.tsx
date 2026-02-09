import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AdminSettingsPanel } from "@/components/AdminSettingsPanel";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  groupId?: string | null;
}

export function SettingsPanel({ isOpen, onClose, groupId }: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-y-0 right-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border z-50 flex flex-col shadow-2xl lg:relative lg:w-80"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-accent rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content - Only Appearance */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <AdminSettingsPanel
                groupId={groupId || ""}
                currentUserId=""
                variant="full"
                hideAdminSettings
                hideManageRoles
              />
            </div>
          </ScrollArea>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
