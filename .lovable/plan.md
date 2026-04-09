

## Plan: Add Super Admin Key Icon to Password-Protected Groups

### Problem
The `GroupCard` component already has the `isSuperAdmin` prop and `KeyRound` icon logic, but `ContactsSidebar.tsx` never passes `isSuperAdmin` to `GroupCard`. The `useAdminRole` hook is imported but only `isAdmin` (aliased as `isGlobalAdmin`) is destructured — `isSuperAdmin` is not extracted or forwarded.

### Changes

**File: `src/components/layout/ContactsSidebar.tsx`**

1. Destructure `isSuperAdmin` from `useAdminRole()` (line 55)
2. Pass `isSuperAdmin={isSuperAdmin}` to each `<GroupCard>` in the Discover tab (line 298–309)

That's it. The `GroupCard` component already:
- Shows the `KeyRound` icon when `isSuperAdmin && hasPassword`
- Opens `ResetGroupPasswordModal` on click
- The modal calls the `set-group-password` edge function which hashes via bcrypt

No backend changes needed. No new components needed.

### Files Modified
- `src/components/layout/ContactsSidebar.tsx` (2 small edits)

