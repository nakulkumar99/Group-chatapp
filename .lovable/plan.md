

## Plan: Verify and Fix Admin Settings Placement + Admin Icon Accessibility

### Current State Analysis

After reviewing the codebase, here is the current state:

1. **Settings Panel** (gear icon in chat header): Currently passes `hideAdminSettings` to hide the Admin Settings section. Shows only "Manage Roles" (for admins) and "Appearance" (for everyone).

2. **Members Panel admin icon** (gear icon in Members panel header): Shows "Admin Settings" (with permission toggles) and "Manage Roles" (with member list) -- matches the screenshot reference.

3. **Admin icon in sidebar**: A shield icon exists in the contacts sidebar but only visible for global admins (super_admin/admin in `admin_roles` table). Navigates to `/admin`.

4. **`/admin` route**: Already configured in `App.tsx`.

### Issues Found

- The Settings panel (gear icon) still renders `AdminSettingsPanel` with "Manage Roles" visible for admins. Per the user's request, Admin Settings should be **completely removed** from the Settings panel -- only Appearance should remain there.
- The `/admin` route admin icon (ShieldCheck) in the sidebar is small and not prominently placed. It should be more easily accessible.

### Changes

#### 1. Remove Admin Settings entirely from Settings Panel (`src/components/layout/SettingsPanel.tsx`)
- Stop rendering `AdminSettingsPanel` in the Settings panel entirely for the admin-related sections
- The Settings panel should only show Appearance (theme + wallpaper)
- This ensures Admin Settings and Manage Roles only appear via the admin icon in the Members panel

#### 2. Add Admin Icon to Chat Header (`src/components/layout/ChatArea.tsx`)
- Add a ShieldCheck icon button in the chat header (next to Users, Settings, and MoreVertical icons) visible only for group admins
- This icon will toggle the Members panel with admin settings open, making it easily accessible

#### 3. Keep `/admin` Route and Global Admin Icon
- The existing `/admin` route and ShieldCheck icon in the sidebar for global admins remain unchanged
- No changes needed to `Admin.tsx`, `useAdminRole.ts`, or `ContactsSidebar.tsx`

### Technical Details

**Files to modify:**
- `src/components/layout/SettingsPanel.tsx` -- Remove `AdminSettingsPanel` import and usage for admin sections; keep only Appearance rendering
- `src/components/layout/ChatArea.tsx` -- Add ShieldCheck admin icon button in the header for group admins, visible only when user has admin role in the group

**No new files or dependencies required.**

