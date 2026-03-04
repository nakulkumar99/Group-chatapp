

## Plan: Super Admin Permanent User Deletion from Admin Panel

### Problem
The current "Delete Account" action in the admin panel only soft-deletes users (sets status to "suspended"). There is no permanent deletion capability for admins. The existing `delete-account` edge function only works for self-deletion.

### Changes

#### 1. Create new edge function `supabase/functions/admin-delete-user/index.ts`
- Accepts `{ target_user_id: string }` in the request body.
- Validates the caller's JWT and checks that the caller is a `super_admin` by querying the `admin_roles` table with the service role client.
- Prevents self-deletion (caller cannot delete their own account).
- Performs cascading deletion of all user data from the same tables as `delete-account` (message_reactions, message_reads, pinned_messages, content_reports, messages, user_roles, group_members, profile_images, profiles, admin_roles, user_bans, user_phone_data, otp_user_rate_limits).
- Calls `adminClient.auth.admin.deleteUser(target_user_id)` to permanently remove the auth user.
- Logs the action to `audit_logs`.

#### 2. Add config entry in `supabase/config.toml`
- Add `[functions.admin-delete-user]` with `verify_jwt = false` (JWT validated in code).

#### 3. Update `useAdminUsers.ts` — `deleteUser` function
- Replace the soft-delete logic with a call to `supabase.functions.invoke("admin-delete-user", { body: { target_user_id: userId } })`.
- Return success/error based on the response.

#### 4. Restrict "Delete Account" to super_admin only in `UserManagement.tsx`
- Pass the current admin's role to the component (use `useAdminRole`).
- Only show the "Delete Account" dropdown item when the current user is a `super_admin`.
- Hide it for `admin` and `moderator` roles.

#### 5. Restrict "Delete Account" button in `UserDetailModal.tsx`
- Accept an `isSuperAdmin` prop.
- Only render the "Delete Account" button when `isSuperAdmin` is true.

### Files Modified
- `supabase/functions/admin-delete-user/index.ts` — new edge function
- `supabase/config.toml` — add function config
- `src/hooks/useAdminUsers.ts` — call edge function instead of soft delete
- `src/components/admin/UserManagement.tsx` — restrict delete to super_admin
- `src/components/admin/UserDetailModal.tsx` — restrict delete button to super_admin

