

## Plan: Add Password Reset Key Icon to GroupCard for Super Admins

### Changes

#### 1. Update `src/components/GroupCard.tsx`
- Add `isSuperAdmin` and `groupId` props (groupId already exists as `id`).
- Import `KeyRound` from lucide-react.
- Import `ResetGroupPasswordModal`.
- Add state for the reset password modal.
- When `isSuperAdmin` is true and `hasPassword` is true, render a `KeyRound` icon button next to the group actions area (right side).
- Clicking the icon opens the `ResetGroupPasswordModal` with the group's ID.
- The icon is only visible to super admins; other users see no change.

#### 2. Update `src/pages/Index.tsx`
- Import and use `useAdminRole` hook.
- Pass `isSuperAdmin` prop to each `GroupCard` instance in both "My Groups" and "Discover" tabs.

### Files Modified
- `src/components/GroupCard.tsx`
- `src/pages/Index.tsx`

