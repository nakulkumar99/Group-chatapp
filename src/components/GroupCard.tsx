import { motion } from "framer-motion";
import { Users, MessageCircle, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GroupCardProps {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  isMember: boolean;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onOpen: (id: string) => void;
}

export function GroupCard({
  id,
  name,
  description,
  memberCount,
  isMember,
  onJoin,
  onLeave,
  onOpen,
}: GroupCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="glass-card rounded-xl p-4 hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => isMember && onOpen(id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          {isMember ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onLeave(id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <UserMinus className="w-4 h-4 mr-1" />
              Leave
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => onJoin(id)}
              className="btn-twitter"
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Join
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
