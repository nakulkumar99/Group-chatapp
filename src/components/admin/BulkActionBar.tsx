import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { CheckCircle2, XCircle, Trash2, X } from "lucide-react";

interface BulkActionBarProps {
  selectedCount: number;
  onActivate: () => Promise<void>;
  onDeactivate: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClear: () => void;
  loading?: boolean;
}

export function BulkActionBar({
  selectedCount,
  onActivate,
  onDeactivate,
  onDelete,
  onClear,
  loading = false,
}: BulkActionBarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const handleAction = async (action: "activate" | "deactivate" | "delete") => {
    setActionLoading(action);
    try {
      switch (action) {
        case "activate":
          await onActivate();
          break;
        case "deactivate":
          await onDeactivate();
          break;
        case "delete":
          await onDelete();
          setDeleteDialogOpen(false);
          break;
      }
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border rounded-lg shadow-lg p-4 flex items-center gap-4">
        <span className="text-sm font-medium">
          {selectedCount} user{selectedCount > 1 ? "s" : ""} selected
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("activate")}
            disabled={loading || actionLoading !== null}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Activate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction("deactivate")}
            disabled={loading || actionLoading !== null}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Deactivate
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={loading || actionLoading !== null}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClear}
            disabled={loading || actionLoading !== null}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} user{selectedCount > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected user accounts and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAction("delete")}
              disabled={actionLoading === "delete"}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading === "delete" ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
