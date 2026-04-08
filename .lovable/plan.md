

## Plan: Trigger Rebuild to Deploy Key Icon Fix + Verify Security

### Problem
The `GroupCard.tsx` source code is correct — the `KeyRound` icon renders when `isSuperAdmin && hasPassword`. Both conditions are verified true in the database. However, the preview DOM does not contain the button, indicating the latest code has not been deployed/built.

### Root Cause
The GroupCard code was updated in the last session but the preview may be serving a cached/stale build. A no-op change will trigger a rebuild.

### Changes

#### 1. Touch `src/components/GroupCard.tsx` to trigger rebuild
Add a harmless comment at the top of the file to force a new build:
```tsx
// GroupCard — password-reset key icon for super admins
```

No logic changes needed — the code is already correct.

### Verification After Build
1. Log in as nakul@gmail.com (super admin)
2. Go to Discover tab
3. Confirm `KeyRound` icon appears on DEV Chats card
4. Click it, enter new password + confirm, submit
5. Verify toast shows success
6. Log in as another user, confirm key icon is NOT visible

### Security Status (No Changes Needed)
- **Message UPDATE group injection**: Fixed — `prevent_message_group_change` trigger blocks `group_id` changes, WITH CHECK uses `is_member_of_group()`
- **Group passwords plaintext**: Fixed — stored value is `$2a$10$...` (bcrypt hash)
- Both findings already deleted from scanner

### Files Modified
- `src/components/GroupCard.tsx` (comment only, to trigger rebuild)

