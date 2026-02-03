

# Simplified Admin Dashboard Plan

## Problem
The current admin dashboard implementation is complex with many dependencies and hooks that may have issues. You want a simpler admin dashboard route with only two small functionalities.

## Solution
Create a simplified admin dashboard with:
1. **Stats Overview** - Display total users and total messages counts
2. **Quick Actions** - View all groups and their member counts

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Admin.tsx` | Simplify to show basic stats and group list |
| `src/components/admin/AdminDashboard.tsx` | Remove complex hooks, show simple stats |
| `src/hooks/useAdminRole.ts` | Keep as-is (works correctly) |

## Implementation Details

### 1. Simplified AdminDashboard.tsx
- Remove dependency on `useContentReports` hook (may cause issues)
- Show only two stat cards:
  - Total Users (from `profiles` table)
  - Total Groups (from `groups` table)
- Simple list of groups with member counts below

### 2. Admin.tsx Changes
- Keep the current access control logic
- Remove unused route imports (UserManagement, ContentModeration, GroupManagement, AuditLogs)
- Only render AdminDashboard for the main route

### 3. Temporary Access for Testing
Since no user currently has admin role, I will add a note about how to assign yourself as admin via the backend.

## Code Changes

### AdminDashboard.tsx (Simplified)
```text
- Remove useContentReports import
- Remove pendingReports, newUsersWeek, messagesToday stats
- Keep only: Total Users, Total Groups
- Add simple group list with member counts
```

### Admin.tsx (Simplified)
```text
- Keep access control (useAdminRole, useAuth)
- Remove unused component imports
- Only show AdminDashboard on index route
- Remove other routes (users, content, groups, logs)
```

## How to Test
After implementation, you need to assign yourself as admin:
1. Go to backend (Lovable Cloud View)
2. Run SQL: `INSERT INTO admin_roles (user_id, role) VALUES ('YOUR_USER_ID', 'admin');`
3. Navigate to /admin to see the dashboard

