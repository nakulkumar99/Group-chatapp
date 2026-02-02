

# Admin Dashboard Implementation Plan

## Overview

Build a comprehensive Admin Dashboard with user management, content moderation, group permissions, statistics, and audit logging. The dashboard will be accessible only to users with the `admin` role and will include proper security measures.

## Database Changes Required

### 1. New Tables

**admin_roles** - Global admin roles (separate from group-specific roles)
```text
- id (uuid, primary key)
- user_id (uuid, references auth.users)
- role (enum: 'super_admin', 'admin', 'moderator')
- created_at (timestamp)
- created_by (uuid) - who assigned this role
```

**audit_logs** - Track all admin actions
```text
- id (uuid, primary key)
- admin_id (uuid) - who performed the action
- action (text) - e.g., 'ban_user', 'delete_message'
- target_type (text) - 'user', 'message', 'group'
- target_id (uuid)
- details (jsonb) - additional context
- created_at (timestamp)
```

**user_bans** - Track banned users
```text
- id (uuid, primary key)
- user_id (uuid)
- banned_by (uuid)
- reason (text)
- banned_at (timestamp)
- expires_at (timestamp, nullable) - null = permanent
```

**content_reports** - User-reported content
```text
- id (uuid, primary key)
- reporter_id (uuid)
- message_id (uuid)
- reason (text)
- status (enum: 'pending', 'reviewed', 'dismissed')
- reviewed_by (uuid, nullable)
- reviewed_at (timestamp, nullable)
- created_at (timestamp)
```

### 2. Database Functions

**is_global_admin** - Check if user has global admin privileges
```text
CREATE OR REPLACE FUNCTION is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = _user_id
    AND role IN ('super_admin', 'admin')
  )
$$;
```

### 3. RLS Policies

- admin_roles: Only super_admins can manage, admins can view
- audit_logs: Only admins can view, insert via security definer function
- user_bans: Only admins can manage
- content_reports: Authenticated users can insert, admins can view/update

## File Structure

```text
src/
├── pages/
│   └── Admin.tsx                      # Main admin dashboard page
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx           # Admin navigation sidebar
│       ├── AdminDashboard.tsx         # Stats overview
│       ├── UserManagement.tsx         # User table with actions
│       ├── ContentModeration.tsx      # Messages & reports
│       ├── GroupManagement.tsx        # Group permissions
│       ├── AuditLogs.tsx              # Activity logs viewer
│       ├── UserRow.tsx                # Single user row component
│       ├── BanUserModal.tsx           # Ban confirmation modal
│       ├── DeleteConfirmModal.tsx     # Delete confirmation modal
│       └── RoleSelector.tsx           # Role assignment dropdown
├── hooks/
│   ├── useAdminRole.ts                # Check admin privileges
│   ├── useAdminUsers.ts               # User management operations
│   ├── useAdminMessages.ts            # Content moderation
│   ├── useAdminGroups.ts              # Group management
│   ├── useAuditLogs.ts                # Audit log operations
│   └── useContentReports.ts           # Report management
```

## Components Breakdown

### AdminSidebar.tsx
- Fixed left sidebar with navigation links
- Icons for each section: Dashboard, Users, Content, Groups, Logs
- Highlight active section
- Collapse on mobile

### AdminDashboard.tsx (Stats Overview)
- Cards showing:
  - Total users count
  - Total messages count
  - Active groups count
  - Pending reports count
  - New users (last 7 days)
  - Messages today
- Quick access to recent reports

### UserManagement.tsx
- Data table with columns: Avatar, Username, Email, Role, Status, Joined, Actions
- Search by username/email
- Filter by role (Admin/Moderator/User)
- Filter by status (Active/Banned)
- Pagination (20 per page)
- Actions: Assign role, Ban/Unban, Delete account
- Confirmation modals for destructive actions

### ContentModeration.tsx
- Tabs: All Messages | Reported | Pinned
- Message list with sender, content preview, group, timestamp
- Search messages by content
- Filter by group
- Actions: View full, Delete, Pin/Unpin
- Bulk selection and delete
- Reports queue with review actions

### GroupManagement.tsx
- List all groups with member counts
- Click to expand group settings:
  - Who can send messages (all/admins only)
  - Who can add members (all/admins only)
  - Who can change group info (creator/admins)
  - Who can pin posts (admins/moderators)
- Member list with role assignment
- Mute/Remove member actions

### AuditLogs.tsx
- Table: Timestamp, Admin, Action, Target, Details
- Filter by action type
- Filter by admin
- Date range picker
- Export to CSV option

## Routes

```text
/admin              → Admin Dashboard (stats)
/admin/users        → User Management
/admin/content      → Content Moderation
/admin/groups       → Group Management
/admin/logs         → Audit Logs
```

## Security Implementation

### Access Control
1. Check admin role on page load via `useAdminRole` hook
2. Redirect non-admins to home page with toast message
3. All admin hooks verify role before operations
4. Audit log every admin action

### Admin Guard Component
```text
function AdminGuard({ children }) {
  const { isAdmin, loading } = useAdminRole();
  
  if (loading) return <LoadingSpinner />;
  if (!isAdmin) {
    toast.error("Access denied");
    return <Navigate to="/" />;
  }
  return children;
}
```

## UI Components Used

- Table, TableHeader, TableBody, TableRow, TableCell (from shadcn)
- Dialog for modals
- DropdownMenu for actions
- Tabs for content sections
- Input for search
- Select for filters
- Button with variants
- Badge for status indicators
- Card for stats
- ScrollArea for lists
- Pagination controls

## Implementation Order

1. **Phase 1: Database Setup**
   - Create admin_roles, audit_logs, user_bans, content_reports tables
   - Create is_global_admin function
   - Set up RLS policies

2. **Phase 2: Core Admin Structure**
   - Create useAdminRole hook
   - Create Admin.tsx page with routing
   - Create AdminSidebar component
   - Add /admin route to App.tsx

3. **Phase 3: Dashboard Stats**
   - Create AdminDashboard component
   - Query counts from profiles, messages, groups, content_reports

4. **Phase 4: User Management**
   - Create useAdminUsers hook
   - Create UserManagement component
   - Create BanUserModal, RoleSelector components
   - Implement search, filter, pagination

5. **Phase 5: Content Moderation**
   - Create useAdminMessages, useContentReports hooks
   - Create ContentModeration component
   - Implement message deletion, report review

6. **Phase 6: Group Management**
   - Create useAdminGroups hook
   - Create GroupManagement component
   - Implement permission toggles, member management

7. **Phase 7: Audit Logs**
   - Create useAuditLogs hook
   - Create AuditLogs component
   - Implement log viewing with filters

## Technical Details

### Admin Role Assignment
Initial admin must be assigned manually via database or create a setup endpoint. Subsequent admins can be assigned by existing admins through the UI.

### Audit Logging
All admin actions call a helper function that:
1. Performs the action
2. Inserts audit log entry
3. Returns result

```text
async function withAuditLog(action, target, callback) {
  const result = await callback();
  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    action,
    target_type: target.type,
    target_id: target.id,
    details: target.details
  });
  return result;
}
```

### Pagination Pattern
Use offset-based pagination for admin tables:
```text
const { data } = await supabase
  .from('profiles')
  .select('*', { count: 'exact' })
  .range(page * pageSize, (page + 1) * pageSize - 1);
```

### Real-time Updates
Subscribe to relevant tables for live updates on dashboard stats and new reports.

