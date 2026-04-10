

## Plan: Role-Based Access System with Nakul_YT Special Permissions

### What exists already
- `admin_roles` table with super_admin-only RLS for mutations
- `audit_logs` table with logging on role changes
- `RoleSelector`, `AuditLogs`, `UserManagement` components
- `assignRole` function in `useAdminUsers` hook
- Self-escalation prevention via RLS (`WITH CHECK` clauses)

### What needs to change

**1. Database Migration — Nakul_YT special account bypass**

Create a database function `is_nakul_yt` that checks if a user's profile username is `Nakul_YT`. Update `admin_roles` RLS INSERT/UPDATE/DELETE policies to also allow `is_nakul_yt(auth.uid())`.

```sql
CREATE FUNCTION public.is_nakul_yt(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND username = 'Nakul_YT'
  )
$$;

-- Update policies to: is_super_admin(auth.uid()) OR is_nakul_yt(auth.uid())
```

**2. New Component — `RoleManagement.tsx`**

A dedicated Role Management page showing:
- Table of all users with current roles
- Role change dropdown (only for super_admin or Nakul_YT)
- Password confirmation dialog before any role change
- Real-time audit log of recent role changes at the bottom

**3. New Component — `PasswordConfirmDialog.tsx`**

A modal that requires the user to re-enter their password before any role change is executed. Uses `supabase.auth.signInWithPassword()` to verify.

**4. Update `ProfileAdminDashboard.tsx`**

Add two new tabs:
- "Role Management" (visible to super_admin + Nakul_YT only)
- "Audit Logs" (visible to all admins)

**5. Update `useAdminRole.ts`**

Add `isNakulYT` boolean to the hook return. Check if the current user's profile username is `Nakul_YT`.

**6. Update `UserManagement.tsx`**

- RoleSelector only enabled for super_admin or Nakul_YT users
- Role changes go through password confirmation first

**7. Update Admin page access (`Admin.tsx`)**

Allow Nakul_YT access to admin panel even without an admin_roles entry (for the role management tab).

### Files Modified
- 1 database migration (new function + updated RLS policies)
- `src/components/admin/RoleManagement.tsx` (new)
- `src/components/admin/PasswordConfirmDialog.tsx` (new)
- `src/components/admin/ProfileAdminDashboard.tsx` (add tabs)
- `src/hooks/useAdminRole.ts` (add isNakulYT check)
- `src/pages/Admin.tsx` (allow Nakul_YT access)
- `src/components/admin/UserManagement.tsx` (gate RoleSelector)

