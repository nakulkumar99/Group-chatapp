

## Plan: Add Super Admin Authorization to Password Reset Backend

### Current State
The feature is already implemented on the frontend:
- `GroupCard.tsx` shows a `KeyRound` icon only when `isSuperAdmin && hasPassword` is true
- `Index.tsx` passes `isSuperAdmin` from `useAdminRole` hook
- `ResetGroupPasswordModal.tsx` calls the `set-group-password` edge function

### Problem
The `set-group-password` edge function only allows group creators and group-level admins to reset passwords. It does **not** authorize super admins. When a super admin who is not the group creator or a group-level admin clicks the key icon and submits, the backend returns a 403 error.

### Fix

#### 1. Update `supabase/functions/set-group-password/index.ts`
- After the group creator check (line 73), add a super admin check using the `admin_roles` table before checking group-level admin roles.
- If the user is a super admin (has `super_admin` role in `admin_roles`), allow the operation to proceed.
- This ensures backend authorization matches the frontend visibility logic.

```
Authorization flow:
1. Is user the group creator? → Allow
2. Is user a super_admin in admin_roles? → Allow
3. Is user a group-level admin in user_roles? → Allow
4. Otherwise → 403
```

### Files Modified
- `supabase/functions/set-group-password/index.ts`

