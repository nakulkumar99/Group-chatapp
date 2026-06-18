Fix blue checkmark (read receipt) cutoff in own-message bubbles on mobile view.

**Problem:** In the mobile screenshot, the blue `CheckCheck` read receipt icons at the right edge of green own-message bubbles are partially cut off by the bubble/container boundary.

**Solution in `src/components/MessageBubble.tsx`:**
1. Add a small right margin (`mr-0.5` or `mr-1`) to the timestamp `<span>` that contains the time and checkmark, ensuring the icon does not clip against the bubble edge.
2. Alternatively, increase the bubble container's right padding from `px-2.5` to `pr-3 pl-2.5` (or `px-3`) for own messages only, giving the checkmark adequate breathing room on mobile.

**What stays unchanged:** Colors, bubble background classes, text layout, edit mode, file rendering, reactions, avatars, deleted messages, action buttons, and all other functionality.