import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, UserMinus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

export const GroupCard = forwardRef<HTMLDivElement, GroupCardProps>(function GroupCard({
  id,
  name,
  description,
  memberCount,
  isMember,
  onJoin,
  onLeave,
  onOpen,
}, ref) {
  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className="bg-secondary/50 hover:bg-secondary/80 rounded-xl p-3 transition-all cursor-pointer border border-border/30"
      onClick={() => isMember && onOpen(id)}
    >
      <div className="flex items-center gap-3">
        {/* Group Avatar */}
        <Avatar className="w-12 h-12 shrink-0">
          <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white font-bold text-sm">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {/* Group Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">{name}</h3>
            <span className="text-xs text-muted-foreground shrink-0">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate mt-0.5">
            {description || "No description"}
          </p>
          
          {/* Action Row */}
          <div className="flex items-center justify-between mt-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>Group chat</span>
            </div>
            
            {isMember ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[hsl(149,67%,45%)] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Joined
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onLeave(id)}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <UserMinus className="w-3.5 h-3.5 mr-1" />
                  Leave
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => onJoin(id)}
                className="h-7 text-xs bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)] rounded-full"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1" />
                Join
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
