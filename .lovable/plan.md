
# Admin Dashboard Fix Plan

## Issues Identified

### 1. Missing cn Import in AdminDashboard.tsx
The `AdminDashboard.tsx` component defines its own `cn` function at the bottom instead of importing the proper one from `@/lib/utils`. This is inconsistent and the local version is less robust.

### 2. No Unique Constraint on admin_roles.user_id
The `admin_roles` table lacks a `UNIQUE` constraint on `user_id`, which means the upsert operation in `useAdminUsers.ts` (line 136) will fail because `onConflict: "user_id"` requires a unique constraint.

### 3. RLS Policy Chicken-and-Egg Problem
The current RLS policy on `admin_roles` for SELECT requires `is_global_admin(auth.uid())` - meaning a user can only check their role if they already have an admin role. This creates a problem where:
- The `useAdminRole` hook queries `admin_roles` to check if user is admin
- But the RLS policy blocks this query unless user is already admin
- Result: Even valid admins cannot access the admin panel

### 4. Empty admin_roles Table
No admin users have been configured, so the Admin Dashboard is inaccessible to everyone.

## Implementation Steps

### Step 1: Database Migration
Create a migration to:
1. Add UNIQUE constraint on `admin_roles.user_id`
2. Update the RLS SELECT policy on `admin_roles` to allow users to read their own role

```sql
-- Add unique constraint for upsert operations
ALTER TABLE public.admin_roles 
ADD CONSTRAINT admin_roles_user_id_unique UNIQUE (user_id);

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;

-- Create new policy that allows users to check their own role
CREATE POLICY "Users can view own admin role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_global_admin(auth.uid()));
```

### Step 2: Fix AdminDashboard.tsx
Replace the local `cn` function with the proper import from `@/lib/utils`.

**Changes:**
- Add `import { cn } from "@/lib/utils";` at the top
- Remove the local `cn` function definition at the bottom

### Step 3: Fix useAdminRole Hook RLS Handling
Update the hook to handle potential RLS errors gracefully when the user doesn't have an admin role.

### Step 4: Provide Initial Admin Setup Instructions
After the fixes, provide a SQL command to insert the first super admin user.

## Files to Modify

| File | Change |
|------|--------|
| Database Migration | Add unique constraint, fix RLS policy |
| `src/components/admin/AdminDashboard.tsx` | Import cn from utils, remove local function |
| `src/hooks/useAdminRole.ts` | Add better error handling for RLS |

## Technical Details

### RLS Policy Logic
The updated policy allows:
- Any authenticated user to read their own admin role (to check if they're an admin)
- Global admins to view all admin roles (for user management)

This solves the chicken-and-egg problem while maintaining security.

### Database Constraint
The UNIQUE constraint on `user_id` enables:
- Upsert operations to work correctly (one role per user)
- Prevents duplicate role assignments

### After Implementation
Run this SQL to create your first super admin:
```sql
INSERT INTO admin_roles (user_id, role) 
VALUES ('YOUR-USER-ID', 'super_admin');
```

Replace `YOUR-USER-ID` with your actual user ID from the `profiles` table.

## Expected Outcome
- Admin Dashboard loads correctly for users with admin roles
- Non-admins are properly redirected with toast message
- Role assignment, user banning, and other admin functions work correctly
- All admin actions are properly logged in audit_logs
