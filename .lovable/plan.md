

## Plan: Mobile View Optimization + Three-Dots Menu for Group Actions

### Issues Identified

1. **Mobile lag**: Heavy `framer-motion` animations on every message (`initial`, `animate`, `exit` with scale + translate), `whileHover`/`whileTap` on group list items, `backdrop-blur` on multiple layers, and `AnimatePresence mode="popLayout"` on the full message list cause jank on mobile devices.

2. **Three-dots menu missing on sidebar group list**: The `ContactsSidebar` "My Groups" tab has no per-group action menu. Users cannot leave/delete groups from the sidebar. The three-dots menu in `ChatArea` header already correctly shows "Leave group" for all users and "Delete group" only for the owner — but it needs the same in the sidebar.

### Changes

#### 1. Reduce mobile animation overhead in `MessageBubble.tsx`
- Remove `scale` from `initial`/`animate`/`exit` transitions (keep only `opacity` and `y`).
- Reduce transition duration from `0.2` to `0.1`.
- These are rendered per-message, so the cost multiplies.

#### 2. Reduce animation overhead in `ChatArea.tsx`
- Change `AnimatePresence mode="popLayout"` to `mode="sync"` (popLayout forces layout recalculations on every message enter/exit).

#### 3. Reduce animation on group list items in `ContactsSidebar.tsx`
- Remove `whileHover` and `whileTap` scale transforms from `motion.button` in the My Groups list (lines 205-229). Replace `motion.button` with a plain `button` element.

#### 4. Add three-dots menu to each group in "My Groups" list in `ContactsSidebar.tsx`
- Add a `MoreVertical` dropdown on each group item in the My Groups tab.
- Show "Leave group" for all users.
- Show "Delete group" only if the current user is the group creator (`group.created_by === user?.id`).
- Add a confirmation `AlertDialog` for delete.
- Wire up `leaveGroup` and `deleteGroup` from `useGroups`.
- Import `MoreVertical`, `LogOut`, `Trash2` icons and `DropdownMenu` components.
- Get current user from `useAuth` (already available via `useProfile` context but need `user.id`).

#### 5. Add three-dots menu to `GroupCard.tsx` (Discover tab)
- Not needed — the Discover tab already has Join/Leave buttons. The three-dots is only relevant for "My Groups".

### Files Modified
- `src/components/MessageBubble.tsx` — lighter animations
- `src/components/layout/ChatArea.tsx` — change AnimatePresence mode
- `src/components/layout/ContactsSidebar.tsx` — remove hover animations, add three-dots menu with leave/delete

