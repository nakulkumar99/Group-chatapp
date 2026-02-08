
# Delete Account Permanently Feature

## Overview
Add a "Delete Account Permanently" button to the Profile page's Security tab that allows users to permanently delete their account and all associated data.

## Implementation Details

### 1. Create Edge Function: `delete-account`
**File:** `supabase/functions/delete-account/index.ts`

The edge function will:
- Authenticate the user via JWT
- Delete all user data in the correct order (respecting foreign key constraints):
  1. Delete from `message_reactions` (messages by this user)
  2. Delete from `message_reads` (by this user)
  3. Delete from `pinned_messages` (pinned by this user)
  4. Delete from `content_reports` (reported by this user)
  5. Delete from `messages` (sent by this user)
  6. Delete from `user_roles` (this user's roles)
  7. Delete from `group_members` (this user's memberships)
  8. Delete from `profile_images` (this user's images)
  9. Delete from `profiles` (this user's profile)
  10. Delete from `admin_roles` (if this user is an admin)
  11. Delete from `user_bans` (if this user was banned)
  12. Delete the auth user via `supabase.auth.admin.deleteUser()`
- Use service role key for admin-level deletion
- Return success/error response

### 2. Update `supabase/config.toml`
Add the new edge function configuration:
```toml
[functions.delete-account]
verify_jwt = false
```

### 3. Add `deleteAccount` function to `useAuth` hook
**File:** `src/hooks/useAuth.ts`

Add a new function:
```typescript
const deleteAccount = useCallback(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { error: new Error("Not authenticated") };
  }
  
  const { data, error } = await supabase.functions.invoke("delete-account", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });
  
  if (error) {
    return { error };
  }
  
  // Sign out locally after successful deletion
  await supabase.auth.signOut();
  return { error: null };
}, []);
```

### 4. Create Delete Account Confirmation Modal
**File:** `src/components/profile/DeleteAccountModal.tsx`

A specialized confirmation modal that:
- Shows a clear warning about permanent deletion
- Requires the user to type "DELETE" to confirm (extra safety)
- Has a destructive-styled delete button
- Shows loading state during deletion

### 5. Update Profile Page Security Tab
**File:** `src/pages/Profile.tsx`

Add to the Security tab:
- A new section titled "Danger Zone"
- Warning text explaining the consequences
- "Delete Account" button (red/destructive style)
- Integration with the DeleteAccountModal
- On successful deletion, redirect to `/auth`

## Database Migration
**File:** `supabase/migrations/<timestamp>_allow_profile_deletion.sql`

Add RLS policy to allow users to delete their own profile:
```sql
CREATE POLICY "Users can delete own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);
```

## Files to Create
1. `supabase/functions/delete-account/index.ts`
2. `src/components/profile/DeleteAccountModal.tsx`

## Files to Edit
1. `supabase/config.toml` - Add function config
2. `src/hooks/useAuth.ts` - Add `deleteAccount` function
3. `src/pages/Profile.tsx` - Add delete account UI to Security tab

## Security Considerations
- User must be authenticated to delete their account
- Edge function validates JWT before proceeding
- Confirmation modal requires typing "DELETE" to prevent accidental clicks
- All user data is removed in the correct order
- Service role key used only in edge function (server-side)
