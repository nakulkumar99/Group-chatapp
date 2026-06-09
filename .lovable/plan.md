## What's broken

In `src/components/MessageBubble.tsx`, the floating action row (emoji react, edit, pin, delete dropdown) is absolutely positioned at `-left-28` / `-right-28` next to the bubble. On mobile (and for own messages near the right edge on desktop) this row renders **off-screen**, gets clipped by the chat scroll container's `overflow`, and the down-arrow delete dropdown opens against the viewport edge — so reactions, edit, and the menu become invisible or unclickable. The emoji picker `PopoverContent` and the delete `DropdownMenuContent` also use fixed `align`/`side` values that don't flip when there's no room.

## Plain explanation

The chat scrolls inside a container with `overflow-y: auto`. Anything pushed outside the bubble with a negative offset gets cut off by that container on small screens. We'll move the action row so it sits **inside** the bubble's row (above the bubble, on the bubble-side edge), use a high z-index, and let Radix's Popover/DropdownMenu auto-flip with `collisionPadding` so the picker and menu always stay inside the viewport.

## Plan

Edit only `src/components/MessageBubble.tsx` and `src/components/EmojiReactionPicker.tsx`. No logic, props, state, or styling tokens change beyond what's listed.

### 1. `MessageBubble.tsx` — action toolbar positioning

- Replace the absolute toolbar wrapper classes:
  - From: `absolute top-0 flex items-center gap-1 z-20 ${isOwn ? "-left-28" : "-right-28"}`
  - To: `absolute -top-8 flex items-center gap-1 z-30 bg-popover/95 backdrop-blur-sm border border-border rounded-full px-1 py-0.5 shadow-md ${isOwn ? "right-0" : "left-0"}`
- This anchors the toolbar above the bubble on the bubble's own side, so it never extends past the chat column on any width.
- On the parent message row container (the `flex gap-2 ...` wrapper at line 327-331), add `relative` is not needed (already positioned via inner `relative group`); keep as-is.
- Increase top padding so the floating toolbar doesn't visually collide with the previous message: add `mt-4` to the inner `relative group` div (line 349) only when `actionsVisible && !isEditing`. Implement via conditional class.

### 2. `MessageBubble.tsx` — delete dropdown content

- On `<DropdownMenuContent ...>` (line 394) change to:
  - `align={isOwn ? "end" : "start"}`
  - add `collisionPadding={8}`
  - add `className="w-52 z-50"`
- This makes the menu flip/shift to stay inside the viewport on mobile and never render under the input bar.

### 3. `EmojiReactionPicker.tsx` — popover content

- On `<PopoverContent ...>`:
  - change `align="start"` to `align="center"`
  - add `collisionPadding={8}`
  - add `z-50` to className
  - add `sideOffset={6}`
- Lets Radix auto-flip to `bottom` when there's no room above (top of chat) and keeps it inside the viewport horizontally.

### 4. Tap-to-toggle on touch devices (already wired)

`actionsVisible` already accounts for `dropdownOpen`. To make the toolbar reachable on touch (no hover), add an `onClick` to the inner `relative group` div that toggles `setShowActions((v) => !v)` only when `!supportsHover`. No new state.

### 5. Overflow safety on the message column

- Change `max-w-[75%]` (line 343) to `max-w-[85%] sm:max-w-[75%]` so bubbles + the in-bounds toolbar have room on small screens.

## Technical details

- z-index: toolbar `z-30`, Radix portals (`PopoverContent`, `DropdownMenuContent`) `z-50`. Both Radix primitives portal to `document.body`, so parent `overflow-hidden`/`transform` no longer clips them.
- `collisionPadding={8}` prevents the picker/menu from touching the viewport edge on 320–414px screens.
- No changes to message data flow, hooks, or RLS.

## Files touched

- `src/components/MessageBubble.tsx`
- `src/components/EmojiReactionPicker.tsx`

## Out of scope

- No backend, hook, or routing changes.
- No restyling of bubbles, avatars, or read receipts.
