
# Profile Admin Dashboard Implementation Plan

## Overview

Build a comprehensive Profile Admin Dashboard for a phone-number-first chat app. This involves significant database schema changes to support phone number as the primary identifier with OTP verification, along with a full-featured admin panel for user CRUD, role management, bulk actions, and audit logging.

## Current State Analysis

The existing codebase has:
- Email-based authentication (Supabase Auth)
- Basic admin dashboard with stats only (Total Users, Total Groups)
- Existing admin infrastructure: `admin_roles`, `audit_logs`, `user_bans` tables
- Existing hooks: `useAdminRole`, `useAdminUsers`, `useAuditLogs`
- Existing components: `UserManagement`, `AuditLogs`, `BanUserModal`, `DeleteConfirmModal`
- shadcn/ui components for tables, dialogs, forms, etc.

## Database Schema Changes

### 1. Add Phone Number to Profiles Table

| Column | Type | Description |
|--------|------|-------------|
| phone_number | text | E.164 format phone number (primary identifier) |
| phone_verified | boolean | OTP verification status |
| phone_verified_at | timestamp | When phone was verified |
| status | enum | 'active', 'inactive', 'suspended' |

### 2. Create OTP Verification Table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| phone_number | text | E.164 phone number |
| otp_code | text | 6-digit OTP code |
| expires_at | timestamp | OTP expiration time |
| verified | boolean | Whether OTP was used |
| created_at | timestamp | Creation timestamp |

### 3. Create User Status Enum

```text
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
```

## File Structure

```text
src/
├── lib/
│   └── validations.ts                    # Add phone validation schema
├── hooks/
│   ├── useAdminUsers.ts                  # Extend with bulk actions, delete
│   └── usePhoneAuth.ts                   # New: Phone OTP authentication
├── components/
│   └── admin/
│       ├── ProfileAdminDashboard.tsx     # New: Main dashboard component
│       ├── UserManagement.tsx            # Enhanced with phone, bulk actions
│       ├── UserDetailModal.tsx           # New: View user details
│       ├── CreateEditUserForm.tsx        # New: Create/edit user form
│       ├── BulkActionBar.tsx             # New: Bulk selection actions
│       ├── AdminAvatarUploader.tsx       # New: Avatar upload with preview
│       └── ActivityLogViewer.tsx         # New: Per-user activity viewer
├── pages/
│   └── Admin.tsx                         # Update with sidebar navigation
└── supabase/
    └── functions/
        ├── send-otp/index.ts             # New: Send OTP via SMS
        └── verify-otp/index.ts           # New: Verify OTP code
```

## Implementation Details

### Phase 1: Database Schema Updates

**Migration SQL:**
```text
-- Create user status enum
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Add phone columns to profiles
ALTER TABLE profiles 
ADD COLUMN phone_number text UNIQUE,
ADD COLUMN phone_verified boolean DEFAULT false,
ADD COLUMN phone_verified_at timestamptz,
ADD COLUMN status user_status DEFAULT 'active';

-- Create index for phone lookup
CREATE INDEX idx_profiles_phone ON profiles(phone_number);

-- OTP verification table
CREATE TABLE otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS for OTP table (admin only)
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage OTPs" ON otp_verifications
  FOR ALL USING (is_global_admin(auth.uid()));
```

### Phase 2: Validation Schemas

**Phone number validation (E.164):**
```text
phoneNumberSchema: z.string()
  .regex(/^\+[1-9]\d{1,14}$/, "Invalid E.164 phone number format")
  .min(8, "Phone number too short")
  .max(16, "Phone number too long")

createUserSchema: z.object({
  phone_number: phoneNumberSchema,
  username: z.string().min(3).max(30),
  bio: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  role: z.enum(['super_admin', 'admin', 'moderator', 'user']).optional()
})

updateUserSchema: createUserSchema.partial()
```

### Phase 3: Enhanced useAdminUsers Hook

**New functions:**
- `createUser(data)` - Create new user with phone
- `updateUser(userId, data)` - Update user details
- `deleteUser(userId)` - Soft/hard delete user
- `bulkActivate(userIds)` - Activate multiple users
- `bulkDeactivate(userIds)` - Deactivate multiple users
- `bulkDelete(userIds)` - Delete multiple users
- `getUserActivity(userId)` - Fetch user's audit trail
- `sendVerificationOTP(phoneNumber)` - Trigger OTP send
- `verifyOTP(phoneNumber, code)` - Verify OTP code

### Phase 4: UI Components

**ProfileAdminDashboard.tsx:**
- Sidebar navigation with icons
- Routes: Dashboard, Users, Activity Logs
- Mobile-responsive with collapsible sidebar
- Breadcrumb navigation

**UserManagement.tsx (Enhanced):**
- Data table columns: Avatar, Phone, Username, Role, Status, Verified, Joined, Actions
- Search by phone or username
- Filters: Role, Status, Verification status
- Pagination (20 per page)
- Checkbox selection for bulk actions
- Row click opens UserDetailModal
- "Add User" button opens CreateEditUserForm

**BulkActionBar.tsx:**
- Appears when users selected
- Shows count: "X users selected"
- Actions: Activate, Deactivate, Delete
- Confirmation modal before destructive actions

**UserDetailModal.tsx:**
- Full profile view: Avatar, phone, username, bio, status
- Tabs: Overview, Activity Log
- Actions: Edit, Ban/Unban, Delete
- Phone verification status with resend OTP option

**CreateEditUserForm.tsx:**
- Form fields: Phone (E.164 input), Username, Bio, Avatar upload, Status, Role
- Avatar preview component
- Client-side validation with zod
- Server-side 422 validation responses
- Accessible labels, keyboard navigation
- Success/error toasts

**AdminAvatarUploader.tsx:**
- File upload with drag-drop
- Image preview before save
- Crop/resize option
- Upload to profile-images bucket

**ActivityLogViewer.tsx:**
- Filter audit_logs by target_id (user)
- Timeline view of actions
- Expandable details

### Phase 5: Edge Functions

**send-otp/index.ts:**
```text
- Validate phone number (E.164)
- Generate 6-digit OTP
- Store in otp_verifications (5 min expiry)
- Call SMS provider API (Twilio/similar)
- Return 200 on success, 422 on validation error
- Rate limit: 1 OTP per minute per phone
```

**verify-otp/index.ts:**
```text
- Validate phone and OTP code
- Check otp_verifications table
- Mark as verified if valid
- Update profiles.phone_verified = true
- Return 200 on success, 422 on invalid
```

### Phase 6: API Response Standards

**Success Response:**
```text
{ success: true, data: {...}, message: "User created successfully" }
```

**Validation Error (422):**
```text
{
  success: false,
  errors: {
    phone_number: ["Invalid E.164 format"],
    username: ["Username already taken"]
  }
}
```

## Security Implementation

### Access Control
1. All admin routes protected by `useAdminRole` hook
2. Non-admins redirected to home with toast message
3. Role hierarchy: super_admin > admin > moderator
4. Moderators can view/ban but not delete or assign roles

### Audit Logging
Every admin action logged to `audit_logs`:
- create_user, update_user, delete_user
- activate_user, deactivate_user
- assign_role, remove_role
- ban_user, unban_user
- send_otp, verify_otp

### RLS Policies
- Profiles: Admins can read all, update any via security definer functions
- OTP table: Only admins can access
- Audit logs: Only admins can read

## UI/UX Requirements

### Mobile-First Responsive Layout
- Collapsible sidebar on mobile (hamburger menu)
- Stacked filters on small screens
- Touch-friendly action buttons
- Swipe gestures for bulk selection

### Accessibility
- Proper form labels with htmlFor
- Keyboard navigation (Tab, Enter, Escape)
- Focus management in modals
- ARIA attributes for dynamic content
- Error announcements for screen readers

### Toast Notifications
- Success: Green, auto-dismiss 3s
- Error: Red, persist until dismissed
- Info: Blue, auto-dismiss 5s

## Implementation Order

| Phase | Tasks | Dependencies |
|-------|-------|--------------|
| 1 | Database migration (phone columns, OTP table, status enum) | None |
| 2 | Validation schemas in validations.ts | Phase 1 |
| 3 | Enhanced useAdminUsers hook | Phase 1, 2 |
| 4 | Edge functions (send-otp, verify-otp) | SMS API key secret |
| 5 | BulkActionBar component | Phase 3 |
| 6 | UserDetailModal component | Phase 3 |
| 7 | CreateEditUserForm with AdminAvatarUploader | Phase 3 |
| 8 | ActivityLogViewer component | None |
| 9 | Enhanced UserManagement with all features | Phase 5, 6, 7 |
| 10 | ProfileAdminDashboard with sidebar routing | Phase 9 |
| 11 | Update Admin.tsx page | Phase 10 |

## Technical Notes

### Phone Number Handling
- Always store in E.164 format (+1234567890)
- Display with formatting based on country code
- Use input mask for user-friendly entry

### OTP Flow
1. Admin enters phone in user form
2. System sends OTP via edge function
3. OTP valid for 5 minutes
4. Admin enters OTP or user self-verifies
5. phone_verified flag set on success

### Bulk Actions
- Use optimistic UI updates
- Show progress for large batches
- Allow cancel during processing
- Rollback on partial failure

### Avatar Upload
- Max 5MB, JPG/PNG/GIF
- Resize to 200x200 for avatars
- Store in profile-images bucket
- Use cache-busting URLs

## Required Secrets

The OTP functionality requires an SMS provider API key. The implementation will use the `add_secret` tool to request:
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Sender phone number
