

## Plan: Fix Group Password Internal Server Error

### Root Cause

The `deno.land/x/bcrypt@v0.4.1` library uses **worker threads** internally for its async methods (`bcrypt.hash()` and `bcrypt.compare()`). Supabase Edge Functions run in a restricted Deno environment that does not support spawning workers, causing these calls to throw an unhandled error — which the outer `try/catch` returns as "Internal server error".

Additionally, the `set-group-password` function enforces a minimum password length of 8 characters, but `CreateGroupModal.tsx` allows passwords as short as 1 character (only checks `password.trim()` is non-empty). The password field also has `maxLength={50}`, which is fine.

### Changes

#### 1. Fix bcrypt in `supabase/functions/set-group-password/index.ts`
- Replace `await bcrypt.hash(password)` with `bcrypt.hashSync(password)`.
- The synchronous version does not use workers and works in Edge Functions.

#### 2. Fix bcrypt in `supabase/functions/join-group-with-password/index.ts`
- Replace `await bcrypt.compare(password, groupPw.password)` with `bcrypt.compareSync(password, groupPw.password)`.

#### 3. Fix password length validation in `src/components/CreateGroupModal.tsx`
- Add minimum password length check (8 characters) to match the edge function's validation, so users get a client-side error instead of a server-side 400.

