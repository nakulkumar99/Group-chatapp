

## Plan: Fix Role Assignment UI Sync Issues

### Root Cause

The edge function and database are working correctly -- roles ARE being saved. The problem is the UI fails to reliably reflect the saved state due to three bugs in `src/hooks/useGroupRole.ts`.

### Bug 1: Unstable `fetchRoleData` Reference

The `fetchRoleData` callback has `[groupId, user]` in its dependency array. The `user` object from `useAuth` gets a new reference on every auth state change. This causes `fetchRoleData` to be recreated, which triggers the realtime subscription effect (depends on `fetchRoleData`) to unsubscribe and resubscribe repeatedly.

**Fix:** Change `useCallback` deps from `[groupId, user]` to `[groupId, user?.id]`, and use a ref for user ID inside the function.

### Bug 2: Silent Query Failures in `fetchRoleData`

The three Supabase queries inside `fetchRoleData` (groups, user role, all roles) do not check for errors. If any query fails (e.g., due to a transient network issue), the function silently sets stale or empty data.

**Fix:** Add error checks after each query. If errors occur, log them and keep existing state instead of overwriting with empty data.

### Bug 3: Race Condition on Refetch

After `updateRoleViaAPI` succeeds, it calls `fetchRoleData()`. Simultaneously, the realtime subscription fires and also calls `fetchRoleData()`. Two concurrent fetches can cause state to be updated with stale data from the slower call.

**Fix:** Use a fetch counter or abort pattern to ensure only the latest fetch result is applied to state.

### Changes

**File: `src/hooks/useGroupRole.ts`**

1. Store `user?.id` in a ref and use `user?.id` in the `useCallback` dependency array instead of `user`
2. Add error handling to all three queries in `fetchRoleData`
3. Add a fetch counter (ref) to `fetchRoleData` so that only the result from the latest call is applied to state
4. Keep the realtime subscription deps stable by depending on `[groupId]` only, using the ref-based `fetchRoleData`

### Technical Details

```text
Before:
  fetchRoleData = useCallback(async () => { ... }, [groupId, user])
  // Realtime effect deps: [groupId, fetchRoleData]

After:
  userIdRef = useRef(user?.id)
  fetchCountRef = useRef(0)
  fetchRoleData = useCallback(async () => {
    const currentFetch = ++fetchCountRef.current;
    // ... queries with error checks ...
    if (fetchCountRef.current !== currentFetch) return; // stale, skip
    // ... set state ...
  }, [groupId])  // stable dependency

  // Update ref when user changes
  useEffect(() => { userIdRef.current = user?.id }, [user?.id])

  // Realtime effect deps: [groupId, fetchRoleData] -- now stable
```

No other files need changes. No database changes needed.

