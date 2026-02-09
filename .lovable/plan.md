

# Fix Unknown Member, Admin Setup, and Role Management

## Overview
Three issues to address:
1. Remove the "Unknown" ghost member from the database (user with no profile)
2. Add Nakul as super_admin (the previous migration didn't persist)
3. Fix the edge function for role assignment (uses non-existent `getClaims` API)

## Issues Found

### 1. Unknown Member
- User ID `c7d76368-4480-4fa9-9da2-65fa73cfb273` exists in `group_members` but has NO profile record and no messages
- This is a ghost/orphaned record that should be removed

### 2. Nakul Admin Role Missing
- The `admin_roles` table has NO record for Nakul (user ID `abab238a-8f86-4de3-b049-01a03f1fab1b`)
- The previous migration may not have executed successfully
- Need to re-insert the super_admin role

### 3. Edge Function Auth Bug
- `update-member-role` edge function uses `supabase.auth.getClaims(token)` which is not a valid Supabase JS API method
- This causes the role assignment to fail silently when admins try to change member roles
- Fix: Replace with `supabase.auth.getUser()` which properly validates the JWT and returns the user

## Implementation

### Database Migration
```sql
-- Remove orphaned "Unknown" member
DELETE FROM group_members 
WHERE user_id = 'c7d76368-4480-4fa9-9da2-65fa73cfb273';

-- Add Nakul as super_admin
INSERT INTO admin_roles (user_id, role)
VALUES ('abab238a-8f86-4de3-b049-01a03f1fab1b', 'super_admin')
ON CONFLICT DO NOTHING;
```

### Fix Edge Function: `supabase/functions/update-member-role/index.ts`
Replace the broken `getClaims` authentication with `getUser()`:

```typescript
// BEFORE (broken):
const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
if (claimsError || !claimsData?.claims) { ... }
const requestingUserId = claimsData.claims.sub as string;

// AFTER (working):
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) { ... }
const requestingUserId = user.id;
```

## Files Changed
- `supabase/migrations/<timestamp>_cleanup_and_admin.sql` (new)
- `supabase/functions/update-member-role/index.ts` (edit lines 42-53)

