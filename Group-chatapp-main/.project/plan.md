## Goal
Match the bubble layout in the screenshot exactly: short messages render as a single compact row — `text` + `time` + `✓✓` all inline on one line, no wrap, no overlap, no extra bottom space.

## Change (single file: `src/components/MessageBubble.tsx`)

Replace the current `<p>` + `float-right` timestamp structure with a flex row:

```tsx
<div className="flex items-end gap-2 min-w-0">
  <p className="text-sm break-words whitespace-pre-wrap min-w-0 flex-1">
    {message.content}
  </p>
  <span className={`flex items-center gap-1 shrink-0 text-[10px] leading-none whitespace-nowrap pb-0.5 ${isOwn ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
    {message.edited_at && <span className="italic">edited</span>}
    {formattedTime}
    {isOwn && <CheckCheck className={`w-3.5 h-3.5 ${readReceipts.length > 0 ? "text-sky-400" : "text-primary-foreground/40"}`} />}
  </span>
</div>
```

Bubble container stays `px-2.5 py-1.5` (compact, matches screenshot).

## What stays unchanged
Colors, bubble classes, edit mode, file rendering, reactions, avatars, deleted placeholder, outer layout, action buttons.

## Result
- Short message ("Hi"): single row → `Hi  03:31 PM ✓✓`
- Long message: text wraps naturally; timestamp stays pinned bottom-right of the row via `items-end` + `shrink-0`.
