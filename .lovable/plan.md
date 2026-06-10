# Fix message timestamp collapsing into text

## Problem
In `src/components/MessageBubble.tsx`, the time (e.g. `04:30 PM`) is rendered as an `absolute bottom-1 right-2` element inside the bubble. On short single-line messages it sits under the text; on longer messages the text often overlaps it because the reserved `pr-12` padding only applies when there is no file and does not reserve vertical space. Same issue affects "edited" + read-receipt icon. Visible on both mobile (390px) and desktop.

## Fix
Make the timestamp part of normal flow as an inline footer inside the bubble, so it never collides with the text.

### Changes in `src/components/MessageBubble.tsx`
1. Remove `absolute bottom-1 right-2` from the timestamp `<span>` (line ~474). Replace with an inline footer:
   - Wrap content + footer so the footer sits on its own line at the bottom-right of the bubble.
   - Footer classes: `mt-1 flex items-center justify-end gap-1 text-[10px] leading-none` plus the existing color classes.
2. Remove the conditional `pr-12` from the message text `<p>` (line ~468) — no longer needed since time is no longer overlapping.
3. Remove `relative` from the bubble's inner `div` only if no longer required (keep it for the pinned indicator — leave as is).
4. Apply the same inline-footer pattern to the deleted-message placeholder (line ~313) for consistency: change `block text-right mt-1` to `flex justify-end mt-1` (already fine, but ensure no overlap; leave unchanged if already inline).

No other files change. No logic, no new dependencies.

## Technical notes
- Timestamp becomes a normal block under the text, right-aligned via `justify-end`. Works identically at all bubble widths (`max-w-[85%] sm:max-w-[75%]`).
- Read-receipt `CheckCheck` icon and "edited" label move with the time into the same footer row.
