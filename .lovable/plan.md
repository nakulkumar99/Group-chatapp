## Goal

Make the chat feed denser and more visually consistent: less vertical gap between messages, tight grouping of consecutive messages from the same sender, balanced left/right alignment, and a fixed avatar gutter so all bubbles line up cleanly.

## Plain explanation

Right now consecutive messages have the same large vertical gap as new-sender messages, the avatar slot/gap differs slightly between mobile and desktop, and bubble padding feels loose. We will:
- Use a smaller gap when the next message is from the same sender (grouped), and a slightly larger gap when the sender changes.
- Lock the avatar column to one fixed width and one fixed gap so own and other messages align identically on both sides.
- Trim bubble padding and the meta (time/check) row so bubbles look compact without clipping.

## Changes

### 1. `src/components/layout/ChatArea.tsx` (message list spacing)
- Replace `<div className="chat-column space-y-2 sm:space-y-2.5">` with a plain `<div className="chat-column">` (remove `space-y-*`).
- In the `messages.map(...)`, compute `isGrouped = index > 0 && messages[index - 1]?.user_id === message.user_id` (same sender as previous).
- Wrap each `<MessageBubble />` in a `<div className={isGrouped ? "mt-0.5" : "mt-3"}>` so grouped messages sit tight (~2px) and new-sender blocks get a clear ~12px break.
- Pass `isGrouped` down so the bubble can hide its avatar/name correctly (already handled via `showAvatar` / `showName`, no API change needed).

### 2. `src/components/MessageBubble.tsx` (alignment, avatar gutter, compact bubble)
- Outer row: change `flex gap-2 sm:gap-3 w-full` to `flex gap-2 w-full items-end` for both the normal and the deleted-placeholder branches. One fixed gap at every breakpoint = symmetrical left/right alignment.
- Avatar slot: keep `Avatar` at `w-8 h-8 shrink-0` but drop `mt-auto` (replaced by row-level `items-end`). The empty placeholder stays `<div className="w-8 shrink-0" />` so grouped messages still indent to the same column.
- Bubble width clamp: change `max-w-[78%] sm:max-w-[70%] md:max-w-[65%] lg:max-w-[60%]` to `max-w-[80%] sm:max-w-[68%] lg:max-w-[58%]` on both the deleted and normal containers (one consistent scale).
- Sender name above bubble: change `mb-1 ml-2` to `mb-0.5 ml-1` to tighten the header.
- Meta row (time + ticks): change `mt-1 ... text-[10px] sm:text-[11px]` to `mt-0.5 ... text-[10px] leading-none`, and reduce icon size `w-3.5 h-3.5` → `w-3 h-3` for `CheckCheck`. Keeps it compact and aligned.

### 3. `src/index.css` (compact, evenly padded bubbles)
- `.chat-bubble`: change padding from `px-3 py-2 sm:px-3.5 sm:py-2.5` to `px-3 py-1.5 sm:px-3.5 sm:py-2`. Keep `text-sm sm:text-[15px] leading-snug sm:leading-relaxed` and the existing `box-shadow`.
- `.message-bubble-own` / `.message-bubble-other`: keep `rounded-[1.125rem] rounded-br-md` / `rounded-bl-md`. No color/shadow changes.

## Out of scope
- No changes to message data flow, hooks, RLS, edge functions, auth, or `ChatInput`.
- No new files. No dependency changes.
- No restructuring of grouping logic beyond the `isGrouped` margin toggle in `ChatArea.tsx`.
