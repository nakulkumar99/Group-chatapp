import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  resultCount: number;
}

export function ChatSearchBar({
  query,
  onQueryChange,
  onClose,
  resultCount,
}: ChatSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      role="search"
      className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b border-border bg-card/90 backdrop-blur-xl"
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
            }
          }}
          placeholder="Search messages..."
          aria-label="Search messages"
          maxLength={100}
          className="pl-9 pr-9 h-9 rounded-full bg-muted border-0 focus:ring-1 focus:ring-primary"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasQuery && (
        <p
          className="text-xs text-muted-foreground whitespace-nowrap"
          aria-live="polite"
        >
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </p>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close search"
        className="h-8 w-8 rounded-full shrink-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
