

## Plan: Restrict Key Icon and Admin Shield to Super Admin Only

### Problem
In the chat header (ChatArea.tsx), the **KeyRound** icon (reset password) and **ShieldCheck** icon (admin settings) are shown to any group-level admin (`isAdmin` from `useGroupRole`). The user wants these visible **only to super admins**.

### Changes

**File: `src/components/layout/ChatArea.tsx`**

1. Import `useAdminRole` hook
2. Destructure `isSuperAdmin` from `useAdminRole()`
3. Change line 309: `{isAdmin && group.has_password && (` → `{isSuperAdmin && group.has_password && (`
4. Change line 320: `{isAdmin && (` → `{isSuperAdmin && (`

No other files need changes. The `ShieldCheck` and `KeyRound` buttons will only render for super admins. All other admin functionality (pinned messages bar, message bubble admin actions) remains unchanged as those are group-level admin features.

### Files Modified
- `src/components/layout/ChatArea.tsx` (add import + 2 condition changes)

