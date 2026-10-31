import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetGroupPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

export function ResetGroupPasswordModal({
  open,
  onOpenChange,
  groupId,
}: ResetGroupPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password.length > 128) {
      toast.error("Password must be 128 characters or fewer");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("set-group-password", {
      body: { group_id: groupId, password },
    });

    setLoading(false);

    if (error) {
      let message = "Failed to reset password";
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === "function") {
        try {
          const body = await context.json();
          if (body?.error) message = body.error;
        } catch {
          // Fall back to the generic message when the response is not JSON.
        }
      }
      toast.error(message);
      return;
    }

    if (data?.error) {
      toast.error(data.error);
      return;
    }

    toast.success("Group password reset successfully");
    setPassword("");
    setConfirmPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Group Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReset} disabled={loading}>
            {loading ? "Resetting..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
