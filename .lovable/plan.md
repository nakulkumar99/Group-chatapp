

## Plan: Fix Mobile Back Button and Scrolling Performance

### Problem 1: Back Button
The back button in `ChatArea.tsx` (lines 271-289) uses a standard `Button` with `size="icon"` which renders as a small target. The mobile and desktop branches are identical code (dead duplication). The button needs a guaranteed 40x40px touch target and proper touch handling.

### Problem 2: Scrolling Performance
The chat uses Radix `ScrollArea` which wraps content in a custom viewport. The `onScrollCapture` handler on `ScrollArea` fires frequently and calls `setShowScrollButton` on every scroll event (causing re-renders). `MessageBubble` uses `framer-motion` `motion.div` with `onMouseEnter`/`onMouseLeave` for hover actions — on mobile these fire erratically and add overhead. The `useLayoutEffect` that calls `scrollIntoView({ behavior: "smooth" })` on every message change can cause layout thrashing.

### Changes

**File: `src/components/layout/ChatArea.tsx`**

1. **Back button fix**: Remove duplicate mobile/desktop branches (lines 271-289). Use a single button with explicit `min-w-[40px] min-h-[40px]` and `touch-action: manipulation` to prevent double-tap zoom and ensure reliable taps. Add `relative z-30` to ensure it's above any overlapping elements.

2. **Scroll handler optimization**: Wrap `handleScroll` logic with a `requestAnimationFrame` throttle so `setShowScrollButton` only fires once per frame instead of on every scroll event. This eliminates jank from state updates during scroll.

3. **Replace `onScrollCapture` with native scroll listener**: Attach the scroll handler directly to the Radix viewport element (the actual scrolling `div`) using a ref and `useEffect` with `{ passive: true }` for hardware-accelerated scroll. This avoids React's synthetic event overhead.

4. **Fix `useLayoutEffect` scroll**: Change `scrollIntoView({ behavior: "smooth" })` to `scrollIntoView({ behavior: "instant" })` for initial loads (avoids layout shift), keep smooth only for user-triggered scroll-to-bottom.

**File: `src/components/MessageBubble.tsx`**

5. **Remove hover-based re-renders on mobile**: The `onMouseEnter`/`onMouseLeave` handlers that toggle `showActions` state cause re-renders on every touch interaction. Wrap them so they only fire on non-touch devices (`window.matchMedia('(hover: hover)')`), or use CSS `:hover` instead of state.

6. **Simplify motion wrapper**: Replace the `motion.div` wrapper for each message with a plain `div`. The existing memory note confirms this optimization pattern is established in the project (lightweight animation strategy).

**File: `src/components/ui/scroll-area.tsx`**

7. **Add hardware acceleration**: Add `will-change: transform` and `-webkit-overflow-scrolling: touch` to the Viewport element for smoother iOS scrolling.

### Files Modified
- `src/components/layout/ChatArea.tsx` (back button fix + scroll optimization)
- `src/components/MessageBubble.tsx` (reduce re-renders on mobile)
- `src/components/ui/scroll-area.tsx` (iOS scroll smoothing)

