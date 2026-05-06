## Plain explanation

The screenshot shows sent (green) bubbles clipped past the right edge of the screen on mobile. The root cause is a mix of: a `pr-12` reservation inside the bubble plus an absolutely-positioned timestamp with no min-width guard, no horizontal safe-padding on the messages list, no `overflow-x` clamp on the scroll viewport, and a chat input row whose buttons can shrink/wrap on small widths. Action buttons (edit/delete/pin) are hover-only, so on touch devices users currently have no way to trigger them. We will normalize bubble structure so sent and received messages share identical spacing/typography, make the input bar fully stable, render emojis safely, and expose edit/delete/pin via a long-press / tap-to-reveal pattern on mobile with instant UI feedback.

## Scope of changes (frontend only)

### 1. `src/components/MessageBubble.tsx`
- Replace ad-hoc `pr-12` on text with a unified bubble layout: a flex column where the timestamp row sits inside the bubble (not absolutely positioned), so sent and received bubbles share identical padding (`px-3 py-2`), radius, font size (`text-sm`), and line-height.
- Wrap content in `min-w-0 break-words whitespace-pre-wrap` so long words/emoji never push width.
- Add `max-w-[85%] sm:max-w-[75%]` to the bubble container (more room on mobile, no clipping).
- Add `overflow-hidden` to the outer flex row and `shrink` on the bubble container.
- Use a dedicated `<span className="emoji">` segment via a tiny inline parser so emoji glyphs use `font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif` (added in `index.css`) — prevents emoji from inheriting variable-width metrics that break layout.
- Make actions container a tap-to-toggle popover on touch devices: tapping the bubble opens a small floating action bar (Reply-style) with Emoji, Edit (own + text), Pin (admin), Delete (own). Hover behavior preserved on desktop.
- Optimistic UI: edit closes input + shows new content immediately; delete (for me / for everyone) removes/replaces bubble immediately; pin toggles the pin badge instantly. (No business-logic changes — the existing `onEdit`, `onDeleteForMe`, `onDeleteForEveryone`, `onPin` callbacks already mutate state through hooks.)
- Add `aria-label`s on action buttons; ensure each is at least 36×36 for accessible touch targets.

### 2. `src/components/ChatInput.tsx`
- Convert the form row to a stable grid: `grid grid-cols-[auto_1fr_auto] items-center gap-2`. This guarantees the input always flexes between two fixed-width buttons (paperclip on left, mic/send on right) without reflowing as the send button appears/disappears.
- Reserve the right slot with a fixed `w-11 h-11` wrapper that swaps mic ↔ send in place (no layout shift).
- Outer container becomes `px-2 py-2 sm:px-3 sm:py-3 pb-[env(safe-area-inset-bottom)]` so the bar sits above the iOS home indicator and never collides with the system nav bar visible in the screenshot.
- Input gets `text-base` (prevents iOS zoom on focus) and `min-w-0` so it cannot push siblings off-screen.
- File-preview card switches to `w-full max-w-full` (was `max-w-sm`) so it does not overflow on 320px screens.

### 3. `src/components/layout/ChatArea.tsx`
- Wrap the messages list with `overflow-x-hidden` and add `px-3 sm:px-4 py-3` (replaces blanket `p-4`) so bubbles get equal left/right safe-padding on mobile.
- Ensure the `ScrollArea` viewport uses `min-w-0` (Radix viewport) by adding a `[&>div]:!min-w-0` className.
- No changes to header (already fixed in previous turn) and no business-logic changes.

### 4. `src/index.css`
- Add an `.emoji` utility:
  ```css
  .emoji { font-family: "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; line-height: 1; }
  ```
- Add a `.chat-bubble` base class consolidating identical paddings/radius/typography used by both `.message-bubble-own` and `.message-bubble-other`, so sent/received are guaranteed pixel-identical.

### 5. Tiny helper `src/lib/renderMessageText.tsx` (new, presentational only)
- Splits message content into text + emoji runs using a Unicode regex (`\p{Extended_Pictographic}`) and wraps emoji in `<span className="emoji">`. Pure function, no deps, no business logic.

## Out of scope
- No changes to hooks, RLS, edge functions, or data fetching.
- No new dependencies.
- Header layout (already fixed previously) is untouched.

## Verification
- Resize preview to 320, 360, 390, 414 px widths and confirm:
  - No horizontal scroll, no clipped bubbles.
  - Sent and received bubbles have visually identical padding and radius (only side + color differ).
  - Input bar stays one row, send/mic swap with no jump.
  - Tapping a bubble on mobile opens action bar; edit/delete/pin update UI instantly.
  - Emojis render in color and do not stretch the bubble.
