

## Plan: Add Back Buttons to Admin Panel and Chat Group Header

### Changes

#### 1. `src/components/admin/ProfileAdminDashboard.tsx`
- Add a back button (ArrowLeft icon) in the sidebar header area that navigates to `/` (home page).
- On mobile, add the back button next to the existing menu toggle button so it's always visible.
- Import `useNavigate` from react-router-dom and `ArrowLeft` from lucide-react.

#### 2. `src/components/layout/ChatArea.tsx`
- Add a back button (ArrowLeft icon) in the chat header, before the group avatar, that navigates to `/` (home/groups list).
- On desktop: show the back button always.
- On mobile: replace the existing Menu hamburger button with an ArrowLeft back button that navigates to `/` instead of opening the sidebar.

### Files Modified
- `src/components/admin/ProfileAdminDashboard.tsx`
- `src/components/layout/ChatArea.tsx`

