## Explanation

On mobile (≤390px), the chat header packs too much into one row: back button + avatar + group info on the left, and up to 5 action icons (KeyRound, ShieldCheck, Users, Settings, MoreVertical) on the right. Each icon button is 40×40 with `px-4` outer padding and `gap-3` on the left, so the right-side icons get squeezed, clipped, or pushed off-screen, and the title gets crowded.

The fix is purely CSS/Flexbox — tighten spacing, shrink icon buttons on small screens, allow the title block to flex/shrink, and prevent the right-side group from shrinking so icons stay visible.

## Changes

**File: `src/components/layout/ChatArea.tsx`** (header block, lines ~283–392)

1. Header container — reduce horizontal padding on mobile:
   - `px-4 h-16` → `px-2 sm:px-4 h-14 sm:h-16`

2. Left group — tighter gap on mobile, allow shrink:
   - `flex items-center gap-3` → `flex items-center gap-2 sm:gap-3 min-w-0 flex-1`

3. Avatar — slightly smaller on mobile, prevent shrink:
   - `w-10 h-10 border-2 border-primary/30` → `w-9 h-9 sm:w-10 sm:h-10 border-2 border-primary/30 shrink-0`

4. Back button — smaller touch target on mobile but still ≥40px:
   - `min-w-[40px] min-h-[40px]` → `min-w-[40px] min-h-[40px] h-10 w-10 sm:h-10 sm:w-10 shrink-0`

5. Right icon group — prevent shrink, tighten gap:
   - `flex items-center gap-1` → `flex items-center gap-0.5 sm:gap-1 shrink-0`

6. All right-side icon `<Button size="icon">` elements — make them compact on mobile:
   - Add `h-9 w-9 sm:h-10 sm:w-10` to each of the 5 buttons (KeyRound, ShieldCheck, Users, Settings, MoreVertical)
   - Icons stay `w-5 h-5`

7. Title `<h1>` — keep `truncate` but ensure parent has `min-w-0` (already added in step 2).

No new dependencies, no new files, no logic changes — pure responsive CSS via Tailwind utilities.

## Result

- Mobile (≤640px): compact 56px header, 36px icon buttons with 2px gaps — all 5 right-side icons fit on a 360–390px viewport without overflow or clipping.
- Desktop (≥640px): unchanged appearance (64px header, 40px buttons, original gaps).
