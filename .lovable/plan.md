## Root cause

1. `src/components/layout/ChatLayout.tsx` only syncs `selectedGroupId` from the URL when `groupId` is truthy. Navigating away to `/` leaves `selectedGroupId` set, so `ChatArea` keeps rendering the same chat — the click appears to do nothing.
2. The back button uses `navigate("/")` instead of going back through the history stack, so it doesn't behave like a real "back" action on mobile or desktop.

## Fix

### 1. `src/components/layout/ChatLayout.tsx`
Update the effect that syncs the URL param so it also clears the selection when no `groupId` is in the URL:

```ts
useEffect(() => {
  setSelectedGroupId(groupId ?? null);
}, [groupId]);
```

### 2. `src/components/layout/ChatArea.tsx` (line 289)
Replace the back button handler with a history-aware version that falls back to `/` when there is no history entry:

```tsx
onClick={() => {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate("/", { replace: true });
  }
}}
```

### 3. `src/pages/ChatRoom.tsx` (line 171)
Apply the same handler to the back button there for consistency on the standalone chat route.

## Result

- Back button on mobile and desktop returns to the previous screen (chat list).
- If the user landed directly on a chat URL (no history), it falls back to `/`.
- `ChatArea` correctly clears when the URL no longer contains a `groupId`.
