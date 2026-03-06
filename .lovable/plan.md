

## Plan: Add Group Password Reset for Admins

### What
Add a lock/key icon button in the chat header, visible only to group admins, that opens a dialog with two fields (new password, confirm password) to reset the group password without requiring the old password.

### Changes

#### 1. New Component: `src/components/ResetGroupPasswordModal.tsx`
- Dialog with two input fields: "New Password" and "Confirm Password"
- Confirm button that validates passwords match and are >= 8 characters
- Calls the existing `set-group-password` edge function via `supabase.functions.invoke`
- Shows success/error toast

#### 2. Update: `src/components/layout/ChatArea.tsx`
- Import `KeyRound` icon from lucide-react
- Import `ResetGroupPasswordModal`
- Add state for modal visibility
- Add a `KeyRound` icon button in the header, next to the existing admin `ShieldCheck` button, visible only when `isAdmin` is true and the group has a password (`has_password`)
- Clicking opens the reset password modal

#### 3. Update: `supabase/functions/set-group-password/index.ts`
- Expand authorization check: allow group admins (users with `admin` role in `user_roles` for that group) in addition to the group creator

#### 4. Update: `src/components/layout/ChatArea.tsx` — fetch `has_password` field
- Include `has_password` in the group fetch query to conditionally show the icon

