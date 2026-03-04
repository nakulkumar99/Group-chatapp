

## Plan: Fix Super Admin Permanent Delete Not Working

### Problem
The `admin-delete-user` edge function uses `userClient.auth.getClaims(token)` which is not a valid method in supabase-js v2. This causes the function to fail silently, so delete does nothing (user stays showing as "suspended" instead of being permanently removed).

### Fix

#### 1. Fix `supabase/functions/admin-delete-user/index.ts`
- Replace `userClient.auth.getClaims(token)` with `userClient.auth.getUser()` (the standard pattern used by all other edge functions in this project).
- Extract `callerId` from `userData.user.id` instead of `claimsData.claims.sub`.

#### 2. Fix `supabase/functions/delete-account/index.ts`
- Same issue: replace `getClaims` with `getUser()` for consistency and correctness.

### Files Modified
- `supabase/functions/admin-delete-user/index.ts`
- `supabase/functions/delete-account/index.ts`

