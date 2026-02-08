
Goal
- When “Only admins can send messages” is turned OFF, regular members must immediately be able to send messages (the chat input must re-appear) without needing a refresh, and it must update for other members too.

What’s happening now (root cause)
- The chat input visibility is controlled by `canSendMessages` in `src/components/layout/ChatArea.tsx`.
- `canSendMessages` comes from `useGroupRole(groupId)`.
- `useGroupRole` fetches `groups.settings` once on mount and then never updates unless the page is refreshed.
- The Admin Settings panel and the ChatArea each create their own separate `useGroupRole()` instance, so toggling the switch updates only the panel’s local state (and the database), but the ChatArea’s hook instance can remain on the old value and keep the input blocked.
- Other members’ clients also won’t update because they are not receiving live updates for `groups.settings`.

Fix (minimal + strict to the request)
1) Enable live updates for `groups` table changes (backend realtime publication)
   - Add a new SQL migration in `supabase/migrations/` that adds `public.groups` to the realtime publication:
     - `ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;`
   - Make it safe to run even if already added by wrapping in a `DO $$ BEGIN ... EXCEPTION ... END $$;` block (so it won’t break future runs).

2) Update `useGroupRole` to react to group settings changes in real time
   File: `src/hooks/useGroupRole.ts`
   - Add a `useEffect` that subscribes to database change events on `public.groups` for the current `groupId`:
     - event: `UPDATE`
     - schema: `public`
     - table: `groups`
     - filter: `id=eq.${groupId}`
   - In the callback, read `payload.new.settings` and call `setGroupSettings(...)` so that:
     - `only_admins_can_send` updates immediately
     - `only_admins_can_add_members` updates immediately
   - Clean up the subscription on unmount / group change via `supabase.removeChannel(channel)`.

3) Keep the local UI consistent after a successful toggle
   File: `src/hooks/useGroupRole.ts`
   - In `updateSettings(...)`, after a successful backend update:
     - keep the current local `setGroupSettings(...)` (already present)
     - additionally call `fetchRoleData()` (or a lightweight refetch of `groups.settings`) so the hook instance that initiated the change stays fully in sync with the database (this avoids edge cases where multiple rapid toggles happen).

Why this resolves the bug
- When an admin toggles the setting OFF, the database row updates.
- Every connected client (including the same user’s ChatArea instance and other members) receives the realtime `UPDATE` event for `groups`.
- `useGroupRole` updates `groupSettings` everywhere, so `canSendMessages` becomes `true` for regular members and the chat input immediately reappears.

Verification steps (end-to-end)
1) As admin:
   - Open a group chat.
   - Open Settings → toggle OFF “Only admins can send messages”.
   - Confirm the chat input remains available for the admin (it should).
2) As a regular member (second browser/incognito or second account):
   - Stay on the same group chat screen while the admin toggles OFF.
   - Confirm the “Only admins can send messages in this group” banner disappears and the chat input shows up without refresh.
   - Send a message successfully.
3) Toggle ON again:
   - Confirm the member’s input is removed and the banner reappears (again without refresh).

Files to change
- Add: `supabase/migrations/<new>_enable_realtime_groups.sql` (name/timestamp generated)
- Edit: `src/hooks/useGroupRole.ts`

Non-goals (explicitly not changing)
- No UI redesign changes.
- No changes to message database policies/enforcement (this fix targets the current UI-blocking behavior and synchronization issue).
