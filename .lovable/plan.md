## Plain explanation

The chat is still stuttering because the message list still does extra work while scrolling and after message/read-receipt updates. The current scroll listener already matches most of your code, but the chat container height still uses `h-screen`, message actions still update state on mobile touches, message timestamps are recalculated on every render, and the message list still uses `AnimatePresence` around every message.

## Plan

### File: `src/components/layout/ChatLayout.tsx`

1. Change the root chat layout container from:

```tsx
<div className="h-screen flex overflow-hidden bg-background theme-transition">
```

to:

```tsx
<div className="h-[100dvh] flex overflow-hidden bg-background theme-transition">
```

This applies your `100dvh` container requirement so mobile browser address-bar resizing does not cause height jumps.

### File: `src/components/layout/ChatArea.tsx`

2. Keep the scroll effect in the exact RAF/passive-listener structure you provided:

```tsx
useEffect(() => {
  const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
  scrollViewportRef.current = viewport;
  if (!viewport) return;

  const onScroll = () => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      setShowScrollButton(distanceFromBottom > 200);
      if (distanceFromBottom < 50) {
        setUnreadBelowCount(0);
      }
    });
  };

  viewport.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    viewport.removeEventListener("scroll", onScroll);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };
}, [groupId]);
```

3. Keep `scrollToBottom` exactly as your snippet:

```tsx
const scrollToBottom = useCallback(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  setUnreadBelowCount(0);
}, []);
```

4. Remove `AnimatePresence` from the message list wrapper and render messages directly with `messages.map(...)`.

This avoids animation bookkeeping for every chat bubble during list updates and keeps the same UI design.

5. Remove the unused `motion` / `AnimatePresence` import from `ChatArea.tsx`.

### File: `src/components/MessageBubble.tsx`

6. Remove mobile `onTouchStart` from each message bubble.

Current mobile behavior changes React state on touch for every message interaction, which can block smooth scroll gestures. Desktop hover actions remain unchanged.

7. Memoize message time formatting with `useMemo`, so `new Date(...).toLocaleTimeString()` does not recalculate for every bubble on each render.

This keeps the same visible timestamp but reduces render cost.

### Validation

8. Test on mobile viewport `390x844`:
- Open `/chat/bf3fbad7-fcff-4d31-9f95-4d2f25555ac0`
- Scroll the chat messages up and down
- Confirm the chat area no longer shutters/stutters
- Tap the back arrow
- Confirm it navigates back/home

## Files to modify

- `src/components/layout/ChatLayout.tsx`
- `src/components/layout/ChatArea.tsx`
- `src/components/MessageBubble.tsx`