## Issue

The absolute-positioned timestamp inside the bubble (`MessageBubble.tsx` line ~474) can visually collapse onto the message text on short single-line messages because the text's `pr-12` and the bubble's `py-1.5` don't leave dedicated vertical space below the text for the time row.

## Fix (single file: `src/components/MessageBubble.tsx`)

1. Bubble container (line ~434): change `px-2.5 py-1.5` → `px-2.5 pt-1.5 pb-4` so a small reserved strip exists at the bottom for the timestamp on both mobile and desktop.
2. Message text `<p>` (line ~467): change `pr-12` → `pr-1` (no longer needed since the time now sits below, not beside).
3. Time `<span>` (line ~474): keep `absolute bottom-1 right-2`; no other change.

No changes to logic, other files, or CSS tokens.
