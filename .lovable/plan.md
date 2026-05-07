## Goal

Make the chat conversation area look premium and consistently aligned across desktop, tablet, and mobile. Today the message stream stretches edge-to-edge on wide screens (no max width) and feels cramped on mobile (no balanced gutters). Bubbles also vary in width because of the avatar spacer.

## Scope (presentation only — no business logic changes)

### 1. `src/components/layout/ChatArea.tsx`
- Wrap the `ScrollArea` inner content (`<div className="space-y-2">…`) and the `messagesLoading` / empty states in a centered max-width container: `mx-auto w-full max-w-3xl xl:max-w-4xl`.
- Update the `ScrollArea` padding to be balanced and breathable on mobile:
  - `px-3 sm:px-6 lg:px-8 py-3 sm:py-4`
- Apply the same centered max-width wrapper around `<ChatInput />` (and the "only admins…" fallback) inside the input bar so the composer aligns with the message column on desktop.
- Header inner row: add the same `max-w-3xl xl:max-w-4xl mx-auto w-full` wrapper so header content aligns to the conversation column (keeps backdrop full-width).

### 2. `src/components/MessageBubble.tsx`
- Tighten and harmonize bubble widths across breakpoints:
  - Container: `max-w-[78%] sm:max-w-[70%] md:max-w-[65%] lg:max-w-[60%]` (apply to both the deleted-state and active-state wrappers).
- Typography polish:
  - Body text: keep `text-[15px] leading-relaxed` on `sm+`, `text-sm leading-snug` on mobile (use `text-sm sm:text-[15px] leading-snug sm:leading-relaxed`).
  - Timestamp row: `text-[10px] sm:text-[11px]`.
- Bubble padding: `px-3 py-2 sm:px-3.5 sm:py-2.5` for a slightly more premium feel on larger screens.
- Avatar gutter: change the empty spacer from `w-8` to `w-8 shrink-0` (already present) and bump gap on desktop: outer flex `gap-2 sm:gap-3`.

### 3. `src/index.css`
- Refine `.message-bubble-own` / `.message-bubble-other` shared rules (if present) to:
  - Use a consistent `border-radius: 1.125rem` with a single tail-corner reduction (`rounded-br-md` for own, `rounded-bl-md` for other) for a modern look.
  - Add a subtle `box-shadow: 0 1px 2px hsl(var(--foreground) / 0.06)` for depth.
- Add a utility `.chat-column { @apply mx-auto w-full max-w-3xl xl:max-w-4xl; }` so the wrappers above stay DRY.

### 4. No changes to
- Message data flow, hooks, edge functions, RLS, auth, send/edit/delete logic.
- ChatInput internal grid (already stable from prior pass) — only its outer wrapper gets the `chat-column` class.

## Result

- Desktop/large screens: messages and composer sit in a centered ~768–896px column with comfortable side gutters; no more edge-to-edge sprawl.
- Tablet: same column with natural side padding.
- Mobile: balanced 12px gutters left/right, slightly tighter bubble max-width (78%), readable typography, no overflow.
