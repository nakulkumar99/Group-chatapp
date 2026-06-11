## Problem

In `src/components/MessageBubble.tsx`, short own-messages like "Hey nakul" get visually clipped on the right edge (see screenshot). Two causes:

1. The bubble's time row uses `mt-1 flex items-center justify-end` which sits on the same horizontal line as the text via flow, but the text `<p>` and the time `<span>` are both block-level inside a `px-3 py-2` container with no `inline-block`/`w-fit` constraint, so when the parent `max-w-[85%]` wrapper is right-aligned (`justify-end` on outer flex) the bubble's effective box doesn't shrink to content — the absolutely-positioned action bar / `rounded-tr-sm` corner overflows the visible area on narrow mobile.
2. Vertical rhythm: `space-y-2` on the messages list + permanent `mt-8` on every bubble wrapper (added in the last fix) doubles the gap between messages.

## Fix

Edit only `src/components/MessageBubble.tsx` and `src/components/layout/ChatArea.tsx`.

### `src/components/MessageBubble.tsx`
1. Change the column wrapper from `max-w-[85%] sm:max-w-[75%]` to `max-w-[78%] sm:max-w-[70%] flex flex-col` so it always stays inside the viewport with safe gutter and children align correctly with `items-end`/`items-start`.
2. On the inner `relative group mt-8` wrapper, change `mt-8` → `mt-6` (still reserves space for the floating action bar, but tighter).
3. On the bubble div (`px-3 py-2 relative ...`):
   - Change padding to `px-2.5 py-1.5` for tighter WhatsApp-style density.
   - Add `w-fit max-w-full` so the bubble shrinks to content but never overflows the column.
4. Restructure the text + time so the time sits inline at the bottom-right without clipping short text:
   - Wrap content in a flex column with `gap-0.5`.
   - Add `min-w-0` to the text `<p>` and add right padding `pr-12` so the timestamp (absolutely positioned `bottom-1 right-2`) never overlaps the last word.
   - Position the time span `absolute bottom-1 right-2` instead of block-flow, matching WhatsApp.

### `src/components/layout/ChatArea.tsx`
1. Line 430: change `space-y-2` → `space-y-0.5` to reduce vertical gap between consecutive messages.

## Scope

- Files: `src/components/MessageBubble.tsx`, `src/components/layout/ChatArea.tsx`
- No logic, no new dependencies, no CSS token changes.
