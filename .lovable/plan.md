## Plain explanation

I checked your database directly: **all your data is still there** — 3 users, 3 profiles, 2 groups, 2 group memberships, 27 messages, and 3 admin roles (including your `super_admin`). Nothing was deleted. Backend connections, RLS policies, and edge functions are all wired correctly.

The real problem is a **React infinite render loop** in `src/hooks/useReadReceipts.ts`. The console shows:

> Maximum update depth exceeded ... at useReadReceipts.ts:15 / :95

When this loop fires inside `ChatArea`, the chat screen freezes/blanks and it looks like "nothing is loading" — groups, members, admin button, messages all appear broken even though the queries succeed. You are also currently on `/auth` (logged out), which is why nothing shows on screen right now; sign in as `nakul@gmail.com` after the fix.

## What is wrong

In `useReadReceipts.ts` the realtime subscription effect has `messageIds` in its dependency array:

```ts
useEffect(() => {
  ...subscribe channel...
}, [groupId, messageIds]);   // messageIds is a NEW array reference every render
```

`messageIds` is rebuilt in `ChatArea` via `useMemo(() => messages.map(m => m.id), [messages])`. Every realtime message INSERT updates `messages`, which produces a new `messageIds` reference, which tears down and re-creates the channel, which triggers more state updates → infinite loop.

The hook already has `messageIdsRef` set up exactly to avoid this — it just isn't being used in the subscription effect.

## The fix (single file)

**`src/hooks/useReadReceipts.ts`** — change the realtime effect so it subscribes once per `groupId` and reads the current `messageIds` from the ref:

- Remove `messageIds` from the subscription effect's dependency array (keep only `[groupId]`).
- Inside the channel handler, use `messageIdsRef.current.includes(...)` (already done) — no other changes needed.
- Also drop `messageIds` from `fetchReadReceipts`'s `useCallback` deps to avoid a secondary refetch storm; trigger refetch from a separate effect that compares ids.

Concretely:
1. Subscription effect deps: `[groupId, messageIds]` → `[groupId]`.
2. `fetchReadReceipts` useCallback deps: `[groupId, messageIds]` → `[groupId]`, and read `messageIdsRef.current` inside it.
3. The "fetch when ids change" effect stays as `useEffect(() => { fetchReadReceipts(); }, [groupId, messageIds.join(",")])` so we still refetch when the id set actually changes by value, not by reference.

## What I'm NOT changing

- No database migrations.
- No RLS changes.
- No edge function changes.
- No changes to auth, groups, members, messages, or admin hooks/queries — they all work; they were just being unmounted by the crashing parent.
- `useAdminRole` already returns `isNakulYT: false` and `Admin.tsx` reads it safely; admin access works via `isAdmin || isModerator` for your super_admin account.

## Verification after the fix

1. Sign in as `nakul@gmail.com` / `nakul@1234`.
2. Confirm the console no longer shows "Maximum update depth exceeded".
3. Confirm groups list loads, opening a group shows the 27 existing messages and members.
4. Confirm the ShieldCheck (admin) icon appears in the chat header and `/admin` route renders the dashboard.
