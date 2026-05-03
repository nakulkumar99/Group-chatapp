## Plan: Apply user's smooth-scroll snippet and test on mobile

### What the user's code says
```ts
const scrollToBottom = useCallback(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  setUnreadBelowCount(0);
}, []);

useLayoutEffect(() => {
  if (!showScrollButton) {
    messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
  }
}, [messagesLength, showScrollButton]);
```

### Current code in `src/components/layout/ChatArea.tsx`
- `scrollToBottom` (lines 166-169) is already identical to the snippet.
- `useLayoutEffect` (lines 179-186) matches the snippet's body but uses `[messages, showScrollButton]` as deps (full array) instead of `messagesLength`. It also calls `markAllAsRead()` which the snippet does not show.

### Change
**File: `src/components/layout/ChatArea.tsx`**
- Change the `useLayoutEffect` dependency array from `[messages, showScrollButton]` to `[messages.length, showScrollButton]` to match the snippet. This prevents the layout effect from re-firing whenever the `messages` array reference changes (edits, reactions, read-receipt updates) and only re-scrolls when the count changes — reducing layout work and improving scroll smoothness.
- Keep `markAllAsRead()` inside the effect (removing it would break read receipts; the user did not ask to remove it).
- `scrollToBottom` stays as-is (already matches).

No other files change.

### Test on mobile viewport
1. `browser--navigate_to_sandbox` at width 390, height 844 (iPhone size), path `/`.
2. `browser--observe` to find a group/chat to open, then `browser--act` to open it.
3. `browser--act` to scroll the messages area up and down; verify the Scroll-to-Bottom button appears past 200px.
4. `browser--act` to tap the back arrow (top-left ArrowLeft); confirm navigation back to `/`.
5. `browser--screenshot` after each step and report findings.

### Files Modified
- `src/components/layout/ChatArea.tsx` (one-line dep array change)
