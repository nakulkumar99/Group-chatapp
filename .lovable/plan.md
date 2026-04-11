

## Plan: Add Password Confirmation and Audit Log to User Management Role Changes

### Problem
The User Management page allows role changes directly without password confirmation. The Role Management tab has password confirmation and audit logs, but User Management does not.

### Changes

**File: `src/components/admin/UserManagement.tsx`**

1. Import `PasswordConfirmDialog` and `useAuditLogs`
2. Add state for `pendingChange` (userId, username, role) and `confirmOpen`
3. Add state and effect for `recentLogs` (fetched via `useAuditLogs().fetchLogs`, filtered to role actions)
4. Change `handleRoleChange` to store the pending change and open the confirm dialog instead of calling `assignRole` directly
5. Add `handleConfirmedRoleChange` that calls `assignRole` after password verification, then reloads users and logs
6. Add `PasswordConfirmDialog` component at the bottom with the pending change context
7. Add a "Recent Role Changes" section below the pagination (same layout as in `RoleManagement.tsx`) showing last 5 role-related audit logs with admin avatar, action description, and timestamp

### Files Modified
- `src/components/admin/UserManagement.tsx` (add password confirm + audit log section)

