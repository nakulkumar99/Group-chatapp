import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReadReceipt {
  id: string;
  user_id: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

interface ReadReceiptAvatarsProps {
  receipts: ReadReceipt[];
  currentUserId?: string;
  maxDisplay?: number;
}

export function ReadReceiptAvatars({
  receipts,
  currentUserId,
  maxDisplay = 5,
}: ReadReceiptAvatarsProps) {
  // Filter out current user and get unique readers
  const readers = receipts.filter((r) => r.user_id !== currentUserId);

  if (readers.length === 0) return null;

  const displayedReaders = readers.slice(0, maxDisplay);
  const remainingCount = readers.length - maxDisplay;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center -space-x-1.5 mt-1">
      {displayedReaders.map((reader, index) => (
        <Tooltip key={reader.id}>
          <TooltipTrigger asChild>
            <Avatar
              className="w-4 h-4 border border-background cursor-pointer"
              style={{ zIndex: displayedReaders.length - index }}
            >
              {reader.profile?.avatar_url ? (
                <AvatarImage
                  src={reader.profile.avatar_url}
                  alt={reader.profile.username}
                />
              ) : null}
              <AvatarFallback className="bg-[hsl(149,67%,38%)] text-white text-[6px]">
                {getInitials(reader.profile?.username || "U")}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>Seen by {reader.profile?.username || "Unknown"}</p>
          </TooltipContent>
        </Tooltip>
      ))}
      {remainingCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center border border-background cursor-pointer">
              <span className="text-[6px] text-muted-foreground font-medium">
                +{remainingCount}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>And {remainingCount} more</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
