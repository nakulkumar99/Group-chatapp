

## Plan: Fix Infinite Re-render Loop and Unhandled Fetch Error

### Problem 1: Maximum Update Depth Exceeded
The `useReadReceipts` hook has a dependency cycle:
- `markAllAsRead` depends on `readReceipts` (line 104) and `messageIds` (line 100)
- `ChatArea` calls `markAllAsRead` inside `useLayoutEffect` with `markAllAsRead` as a dependency (line 168)
- When `markAllAsRead` changes reference (due to `readReceipts` changing), `useLayoutEffect` fires again, which can trigger state updates, causing infinite loops

**Fix in `src/hooks/useReadReceipts.ts`**:
- Use `useRef` to hold `readReceipts` and `messageIds` so `markAllAsRead` and `markAsRead` callbacks have stable references
- Remove `readReceipts` from the dependency array of `markAsRead` and `markAllAsRead` by reading from refs instead

**Fix in `src/components/layout/ChatArea.tsx`**:
- Remove `markAllAsRead` from the `useLayoutEffect` dependency array (line 168) to prevent re-triggering on every state change

### Problem 2: Unhandled Promise Rejection in joinGroup
The `joinGroup` function in `src/hooks/useGroups.ts` (line 131) uses raw `fetch()` without try/catch. Network failures cause unhandled promise rejections.

**Fix in `src/hooks/useGroups.ts`**:
- Wrap the `fetch` call in a try/catch block
- Return `{ error }` on network failure instead of throwing

### Security Status
All security scan findings are either resolved, informational, or intentionally ignored. No error-level findings remain.

### Files Modified
- `src/hooks/useReadReceipts.ts` (stabilize callback references)
- `src/components/layout/ChatArea.tsx` (fix useLayoutEffect deps)
- `src/hooks/useGroups.ts` (add try/catch to joinGroup fetch)

