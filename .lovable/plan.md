
# Chat Application Role Control System

## Overview

This plan implements a comprehensive per-group role control system with Admin, Moderator, and Member roles, restricting message sending and member management to Admins only.

## Current State Analysis

The codebase already has:
- A `user_roles` table with `app_role` enum (`admin`, `moderator`, `member`)
- `useGroupRole` hook for fetching and managing roles
- Basic permission checks via `canSendMessages` and `canAddMembers`
- `AdminSettingsPanel` component for role management

## What Needs to Change

### 1. Update Permission Logic

**Current:** `canSendMessages` allows everyone unless `only_admins_can_send` setting is enabled
**Required:** Admins ONLY can send messages (no toggle needed)

### 2. Create Edge Function for Role Updates

Create `update-member-role` edge function with server-side permission validation.

### 3. Update UI Components

Add role badges, three-dot menus, and confirmation modals to the MembersPanel.

---

## Implementation Details

### Database Changes

No schema changes required - the `user_roles` table and `app_role` enum already exist with the correct values (`admin`, `moderator`, `member`).

### File: `supabase/functions/update-member-role/index.ts` (NEW)

Create edge function to handle role updates with server-side validation:

```text
Endpoint: PUT /update-member-role
Body: { groupId, targetUserId, newRole }
Validation:
  1. Authenticate user via JWT
  2. Check if user is admin in the group
  3. Return 403 if not authorized
  4. Update/insert role and return success
```

### File: `src/hooks/useGroupRole.ts` (MODIFY)

Update permission logic:

```text
Changes:
- Line 202: Change canSendMessages = isAdmin (remove toggle dependency)
- Line 203: Change canAddMembers = isAdmin (remove toggle dependency)
- Add confirmRoleChange function that calls the edge function
```

### File: `src/components/layout/MembersPanel.tsx` (MODIFY)

Add role management UI:

```text
New imports:
- MoreVertical, Settings (icons)
- DropdownMenu components
- AlertDialog components
- toast from sonner

New state:
- showRoleModal: boolean
- pendingRoleChange: { userId, newRole } | null

New UI elements:
1. Role badges next to usernames:
   - Admin: 👑 crown icon (already exists)
   - Moderator: 🛡️ shield icon (already exists)  
   - Member: 👤 user icon (new)

2. Three-dot menu (visible to Admins only):
   - "Make Admin"
   - "Make Moderator"  
   - "Make Member"

3. Admin settings icon in header (visible to Admins only)

4. Confirmation AlertDialog:
   - Title: "Change Role"
   - Description: "Change [Username] to [Role]?"
   - Buttons: Cancel / Confirm
```

### File: `src/components/layout/ChatArea.tsx` (MODIFY)

Update to use new permission logic:

```text
Line 80: Already uses canSendMessages from useGroupRole
Line 376-383: Already shows/hides ChatInput based on canSendMessages

Changes:
- Update the disabled message to: "Only admins can send messages"
- Add toast error when blocked actions are attempted
```

### File: `src/components/CreateGroupModal.tsx` (MODIFY)

No changes needed - the component is only shown to users who can create groups, and group creators automatically become admins.

### File: `src/components/layout/ContactsSidebar.tsx` (MODIFY)

Hide "Join Group" functionality for non-admins when `only_admins_can_add_members` is enabled:

```text
Changes:
- Add admin icon link to /admin for global admins
- Keep create group visible (creators become admins)
```

---

## Component Architecture

```text
MembersPanel
├── Header
│   ├── Members count
│   └── Admin Settings icon (Admin only)
├── Member List
│   └── Member Item
│       ├── Avatar with online indicator
│       ├── Username
│       ├── Role Badge (👑/🛡️/👤)
│       └── Three-dot menu (Admin only)
│           ├── Make Admin
│           ├── Make Moderator
│           └── Make Member
└── Role Change Confirmation Modal
```

---

## Permission Matrix

| Action | Admin | Moderator | Member |
|--------|-------|-----------|--------|
| Send messages | Yes | No | No |
| Add members | Yes | No | No |
| Change roles | Yes | No | No |
| View messages | Yes | Yes | Yes |
| View members | Yes | Yes | Yes |
| Leave group | Yes | Yes | Yes |

---

## API Endpoint Flow

```text
Client                    Edge Function                  Database
  │                            │                            │
  ├──PUT /update-member-role──►│                            │
  │   {groupId, userId, role}  │                            │
  │                            │                            │
  │                            ├──Verify JWT────────────────►
  │                            │                            │
  │                            ├──Check admin role──────────►
  │                            │                            │
  │                       ◄────┤   Return user role         │
  │                            │                            │
  │   (if not admin)           │                            │
  │◄─────403 Forbidden─────────┤                            │
  │                            │                            │
  │   (if admin)               │                            │
  │                            ├──Upsert role───────────────►
  │                            │                            │
  │◄─────200 Success───────────┤                            │
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/update-member-role/index.ts` | CREATE | Edge function for role updates |
| `src/hooks/useGroupRole.ts` | MODIFY | Update permission logic, add API call |
| `src/components/layout/MembersPanel.tsx` | MODIFY | Add role UI, menus, modals |
| `src/components/layout/ChatArea.tsx` | MODIFY | Add toast for blocked actions |
| `src/components/layout/ContactsSidebar.tsx` | MODIFY | Add admin icon link |

---

## Error Handling

- Server returns 403: Show toast "Only admins can perform this action"
- Network error: Show toast "Failed to update role. Please try again."
- Success: Show toast "Role updated to [role]"

---

## Testing Checklist

1. Admin can see three-dot menu on all members
2. Non-admins cannot see three-dot menu
3. Role change shows confirmation modal
4. Role change updates badge immediately
5. Non-admins see disabled message input
6. Non-admins get toast when attempting restricted actions
7. Edge function returns 403 for unauthorized requests
