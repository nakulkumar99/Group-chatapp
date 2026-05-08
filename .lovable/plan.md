# Plain explanation
The action toolbar on each chat bubble (emoji react, edit, pin, delete dropdown) is currently absolutely positioned 28 units to the side of the bubble (`-left-28` / `-right-28`). On narrow viewports this pushes the buttons off the edge of the chat column so they get clipped or are unreachable. On long chats the toolbar can also sit underneath sticky elements because it doesn't have a high enough stacking context. Same issue affects the dropdown menu (down‑arrow) used for delete. The fix is purely CSS/positioning.

# Plan

## File: `src/components/MessageBubble.tsx`

1. **Toolbar positioning (lines ~351‑358)**
   - Replace fixed `-left-28 / -right-28` placement with a responsive scheme:
     - On mobile (`<sm`): render the toolbar **above** the bubble (`-top-9`) aligned to the bubble's own side (`right-0` for own, `left-0` for other) so it always stays inside the chat column.
     - On `sm+`: keep the side placement but use `-left-2 translate-x-[-100%]` / `-right-2 translate-x-full` so it sits flush to the bubble without overflowing the 75% column.
   - Add `bg-popover/95 backdrop-blur rounded-full shadow-md border border-border px-1 py-0.5` so the floating bar has its own surface and stays legible over any message.
   - Bump z-index from `z-20` to `z-30`.

2. **Always-visible affordance on touch (lines ~322‑331, ~109)**
   - On devices without hover, show a compact trigger so users can open actions reliably. Set `actionsVisible = true` when `!supportsHover` (mobile) so the bar is always rendered for the user's own messages and stays tappable. Keep hover behavior for desktop.

3. **Dropdown menu (lines ~384‑425)**
   - Add `sideOffset={8}`, `collisionPadding={8}`, and `avoidCollisions` (default true) on `DropdownMenuContent` so the "Delete for me / everyone" menu auto-flips and never gets cut by the viewport edge.
   - Set `className="w-52 z-50"` to ensure it layers above sticky chat header / scroll-to-bottom button.

4. **Bubble overflow guard (line ~349 wrapper and line ~343)**
   - Add `min-w-0` to the bubble column wrapper and keep `max-w-[75%]` so toolbar repositioning above the bubble doesn't force horizontal scroll.
   - Add `overflow-visible` to `.relative.group` wrapper (line 349) to make sure the toolbar isn't clipped by any ancestor `overflow-hidden`.

## File: `src/components/EmojiReactionPicker.tsx` (verify only — read first)
   - Ensure its Popover content uses `sideOffset` and `collisionPadding` so the emoji panel also auto-flips on mobile. Adjust if not.

## Out of scope
- No changes to message logic, hooks, data, or business rules.
- No changes to header, sidebar, or unrelated components.

# Technical summary of class changes (MessageBubble.tsx)

```text
toolbar wrapper (was):
  absolute top-0 flex items-center gap-1 z-20
  isOwn ? -left-28 : -right-28

toolbar wrapper (new):
  absolute z-30 flex items-center gap-1
  bg-popover/95 backdrop-blur rounded-full border border-border shadow-md px-1 py-0.5
  // mobile: above bubble, inside column
  -top-9 sm:top-0
  isOwn
    ? "right-0 sm:right-auto sm:left-0 sm:-translate-x-[calc(100%+0.5rem)]"
    : "left-0  sm:left-auto  sm:right-0 sm:translate-x-[calc(100%+0.5rem)]"

DropdownMenuContent (new):
  align="end" sideOffset={8} collisionPadding={8}
  className="w-52 z-50"
```

After the edit I will screenshot mobile (375) and desktop (1280) to verify nothing is clipped.
