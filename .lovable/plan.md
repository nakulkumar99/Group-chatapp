

## Plan: Fix Role Assignment Bugs

### Problems Found

After reviewing the code, I found these bugs:

1. **AdminSettingsPanel "Manage Roles" canModify logic is wrong** (line 242 in `AdminSettingsPanel.tsx`):
   - Currently: `const canModify = isCreator && member.user_id !== currentUserId;`
   - This only allows the group **creator** to modify roles. If a user is promoted to admin (but isn't the creator), they can SEE the Manage Roles section but the dropdown never appears -- they can't actually change anyone's role.
   - Also missing: preventing modification of the group creator's role (the edge function blocks it, but the UI should too).

2. **No realtime subscription for `user_roles` table** in `useGroupRole.ts`:
   - After a role is changed by another admin, the UI won't update until the page is refreshed. The hook subscribes to `groups` table changes (for settings) but not `user_roles`.

3. **`creatorId` not exposed from `useGroupRole`**:
   - The hook knows the `created_by` value but only exposes a boolean `isCreator`. The AdminSettingsPanel needs the actual creator ID to prevent showing the modify dropdown for the group owner.

### Changes

#### 1. `src/hooks/useGroupRole.ts`
- Add a `creatorId` state variable and expose it in the return
- Store `group.created_by` when fetched
- Add a realtime subscription for `user_roles` table changes (same pattern as the `groups` subscription) so role changes sync across clients

#### 2. `src/components/AdminSettingsPanel.tsx`
- Get `creatorId` from `useGroupRole`
- Fix `canModify` logic:
  - Change from `isCreator && member.user_id !== currentUserId` to `isAdmin && member.user_id !== currentUserId && member.user_id !== creatorId`
  - This allows any admin to modify roles (not just the creator) while protecting the creator's role from being changed

### Technical Details

**`useGroupRole.ts` changes:**
- New state: `const [creatorId, setCreatorId] = useState<string | null>(null);`
- Set it: `setCreatorId(group?.created_by || null);`
- New realtime channel subscribing to `user_roles` table filtered by `group_id`
- Return `creatorId` in the hook's return object

**`AdminSettingsPanel.tsx` changes:**
- Destructure `creatorId` from `useGroupRole`
- Update line 242: `const canModify = isAdmin && member.user_id !== currentUserId && member.user_id !== creatorId;`
- Update `getRoleIcon` to use `creatorId` instead of `isCreator && userId === currentUserId` so the crown shows for the actual group creator, not just the current user

