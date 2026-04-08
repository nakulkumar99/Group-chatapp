// GroupCard — password-reset key icon for super admins
import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, UserMinus, Check, Lock, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ResetGroupPasswordModal } from "@/components/ResetGroupPasswordModal";

interface GroupCardProps {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  isMember: boolean;
  hasPassword: boolean;
  onJoin: (id: string, password?: string) => Promise<{ error: unknown }>;
  onLeave: (id: string) => void;
  onOpen: (id: string) => void;
  isSuperAdmin?: boolean;
}

export const GroupCard = forwardRef<HTMLDivElement, GroupCardProps>(function GroupCard({
  id,
  name,
  description,
  memberCount,
  isMember,
  hasPassword,
  onJoin,
  onLeave,
  onOpen,
  isSuperAdmin = false,
}, ref) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [joining, setJoining] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  const getInitials = (text: string) => {
    return text
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleJoinClick = () => {
    if (hasPassword) {
      setShowPasswordDialog(true);
      setPassword("");
      setPasswordError("");
    } else {
      onJoin(id);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setPasswordError("Password is required");
      return;
    }
    setJoining(true);
    setPasswordError("");
    const result = await onJoin(id, password);
    setJoining(false);
    if (result?.error) {
      setPasswordError("Incorrect password");
    } else {
      setShowPasswordDialog(false);
      setPassword("");
    }
  };

  return (
    <>
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
          <Avatar className="w-12 h-12 shrink-0">
            <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white font-bold text-sm">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-foreground truncate">{name}</h3>
                {hasPassword && !isMember && (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {description || "No description"}
            </p>
            
            <div className="flex items-center justify-between mt-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>Group chat</span>
              </div>
              
              <div className="flex items-center gap-2">
                {isSuperAdmin && hasPassword && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowResetModal(true)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    title="Reset group password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                )}
                {isMember ? (
                  <>
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
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleJoinClick}
                    className="h-7 text-xs bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)] rounded-full"
                  >
                    {hasPassword && <Lock className="w-3 h-3 mr-1" />}
                    <UserPlus className="w-3.5 h-3.5 mr-1" />
                    Join
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Enter Group Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This group is password protected. Enter the password to join <strong>{name}</strong>.
            </p>
            <Input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
              placeholder="Enter password"
              className="h-12"
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
            />
            {passwordError && (
              <p className="text-destructive text-sm">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handlePasswordSubmit}
              disabled={joining}
              className="bg-[hsl(149,67%,38%)] hover:bg-[hsl(149,67%,33%)]"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Join Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ResetGroupPasswordModal
        open={showResetModal}
        onOpenChange={setShowResetModal}
        groupId={id}
      />
    </>
  );
});
