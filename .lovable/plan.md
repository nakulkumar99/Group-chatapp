
# WhatsApp-like Admin Settings Panel

## Overview
Create a unified, reusable `AdminSettingsPanel` component that consolidates Admin Settings, Manage Roles, and Appearance into a single card-style UI. This panel will be used in both the Members sidebar and the main Settings pane.

## Component Structure

```text
+-------------------------------------------+
| AdminSettingsPanel                        |
+-------------------------------------------+
|  [Collapsible] Admin Settings    ^        |
|  +-------------------------------+        |
|  | Only admins can send messages   [  ]   |
|  | Only admins can add members     [  ]   |
|  +-------------------------------+        |
|                                           |
|  [Collapsible] Manage Roles      ^        |
|  +-------------------------------+        |
|  | [Avatar] Thapa      [role] [...]|      |
|  | [Avatar] Nakul (you) [crown]    |      |
|  +-------------------------------+        |
|                                           |
|  [Collapsible] Appearance        ^        |
|  +-------------------------------+        |
|  | [Sun] Light | [Moon] Dark *    |      |
|  |                                |       |
|  | Chat Wallpaper                 |       |
|  | [img][img][img]                |       |
|  | [img][img][img]                |       |
|  |                                |       |
|  | [Upload Custom Wallpaper]      |       |
|  +-------------------------------+        |
+-------------------------------------------+
```

## Files to Create/Modify

### 1. Refactor `src/components/AdminSettingsPanel.tsx`
Transform the existing component into a comprehensive unified panel with three sections:

**Changes:**
- Add `variant` prop: `"full"` (all sections) or `"admin-only"` (admin settings + roles only)
- Add `showAppearance` prop to control Appearance section visibility
- Integrate theme toggle (Light/Dark segmented control)
- Integrate wallpaper selection grid
- Add Upload Custom Wallpaper button
- Style with WhatsApp green accent and neutral grays
- Icons: Shield (admin settings), Crown (owner), User roles icons

### 2. Update `src/components/layout/SettingsPanel.tsx`
- Replace separate AdminSettingsPanel + Appearance controls with unified `AdminSettingsPanel` component
- Pass `variant="full"` to show all sections

### 3. Update `src/components/layout/MembersPanel.tsx`
- Replace existing AdminSettingsPanel usage with unified component
- Pass `variant="full"` or `showAppearance={true}` to include Appearance section

## Implementation Details

### Props Interface
```typescript
interface AdminSettingsPanelProps {
  groupId: string;
  currentUserId: string;
  variant?: "full" | "admin-only";  // full includes Appearance
  compact?: boolean;  // for narrow sidebar display
}
```

### Section 1: Admin Settings
- Shield icon (`ShieldCheck`) in section header
- Two toggle switches:
  - "Only admins can send messages"
  - "Only admins can add members"
- Collapsible with animated chevron

### Section 2: Manage Roles
- Shield icon (`Circle` or custom) in section header
- User list with:
  - Avatar (32x32px)
  - Username + "(you)" label for current user
  - Role icon: Crown (owner/amber), ShieldCheck (admin/green), Shield (moderator/sky), User (member/gray)
  - Inline dropdown menu (ChevronDown) for role changes
- Only show dropdown for non-owner, non-self members when user is admin

### Section 3: Appearance
- Palette or Paintbrush icon in section header
- Segmented toggle: Light (Sun icon) | Dark (Moon icon)
  - Active state: filled button with primary color
  - Inactive state: outline button
- "Chat Wallpaper" label with Image icon
- 3-column grid of wallpaper thumbnails (64px height)
  - Selected wallpaper shows checkmark overlay
- "Upload Custom Wallpaper" button (full width, outline style)
- If custom wallpaper active, show preview with checkmark

### Styling Specifications

**Colors:**
- Green accent: `hsl(149 67% 38%)` - WhatsApp green (already in CSS)
- Dark gray background: `bg-card/95` with `backdrop-blur-xl`
- Section backgrounds: `bg-accent/30`
- Border: `border-border`

**Spacing:**
- Section header padding: `px-3 py-2`
- Section content padding: `p-3` or `p-4`
- Gap between sections: `space-y-4`
- Avatar size: `w-8 h-8` (compact) or `w-10 h-10` (full)
- Wallpaper thumbnail grid gap: `gap-2`
- Wallpaper thumbnail height: `h-16`

**Typography:**
- Section headers: `font-medium text-sm`
- Toggle labels: `text-sm`
- Username: `text-sm font-medium`
- Role label: `text-xs text-primary`

**Animations:**
- Chevron rotation: 180deg on open (framer-motion)
- Collapsible content: height animation

### Icon Mapping
| Element | Icon | Color |
|---------|------|-------|
| Admin Settings header | ShieldCheck | foreground |
| Manage Roles header | Circle (outlined) | foreground |
| Appearance header | Palette or Image | foreground |
| Owner role | Crown | amber-500 |
| Admin role | ShieldCheck | primary (green) |
| Moderator role | Shield | sky-500 |
| Member role | User | muted-foreground |
| Light mode | Sun | - |
| Dark mode | Moon | - |

## Dual Placement Demo

Both `MembersPanel` and `SettingsPanel` will render the same `AdminSettingsPanel` component:

**MembersPanel (narrow, 280px):**
- Compact spacing
- Same three collapsible sections
- Visible via Settings gear button toggle

**SettingsPanel (320px):**
- Standard spacing
- Same three collapsible sections
- Primary content of the panel

## Technical Considerations

1. **Theme Context**: Import `useThemeContext` from ThemeProvider for appearance controls
2. **File Upload**: Reuse existing file input pattern from SettingsPanel
3. **Role Permissions**: Only show sections/controls user has permission to modify
4. **Non-Admin View**: If user is not admin, only show Appearance section
5. **Realtime Updates**: Leverage existing `useGroupRole` hook subscriptions
