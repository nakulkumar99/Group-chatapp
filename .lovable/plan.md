

## Plan: Fix "Failed to assign role" Error

### Root Cause
The user `Nakul_YT` (user_id: `d8ca1db9-ddaa-4f06-86cb-bc33aeab3445`) has role `admin` in the `admin_roles` table. But the RLS policies on `admin_roles` only allow users with `super_admin` role to insert, update, or delete roles. Since this user is only `admin`, every role assignment attempt is blocked by RLS.

### Fix
Run a migration to upgrade this user to `super_admin`. This is a one-time bootstrap operation — once the user is `super_admin`, they can manage all roles from the UI.

**Migration SQL:**
```sql
UPDATE public.admin_roles
SET role = 'super_admin'
WHERE user_id = 'd8ca1db9-ddaa-4f06-86cb-bc33aeab3445';
```

No code changes needed. The `assignRole` function and RLS policies are correct — the user simply needs the `super_admin` role to use them.

### Files Modified
- One database migration only (no code files changed)

