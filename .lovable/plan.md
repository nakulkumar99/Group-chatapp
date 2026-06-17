## Fix Message Bubble Text/Timestamp Layout

### Problem
The selected message bubble div shows text and timestamp colliding visually (e.g., "Hey what's app09:39 PM"). The absolute-positioned timestamp overlaps with short message text on both mobile and desktop.

### Solution
Only modify the inner message bubble div (the `<div>` containing message text + absolute timestamp) to fix spacing and alignment without changing any other component logic, colors, or functionality.

### Changes
1. **Message text (`<p>`)**: Adjust `padding-right` to ensure sufficient clear space for the timestamp on all screen sizes. Use responsive padding (`pr-16` or equivalent via `min-w`) so short messages don't collapse into the timestamp.
2. **Timestamp (`<span>`)**: Keep absolute positioning but fine-tune `bottom`/`right` offsets so it sits cleanly in the reserved bottom-right space without clipping or overlap.
3. **Bubble container**: Ensure `pb-5` bottom padding is enough for the timestamp line, and `w-fit max-w-full` behaves correctly on narrow mobile viewports (prevent overflow/horizontal scroll).
4. **Responsive safeguard**: Verify `max-w-[78%] sm:max-w-[70%]` on the outer column still contains the bubble properly after padding changes.

### What stays unchanged
- All colors, borders, border-radius, hover actions, emoji reactions, edit mode, file rendering
- Outer flex layout (`justify-end` / `justify-start`) and avatar spacing
- `mt-6` on the `relative group`, `space-y-0.5` between messages
- Deleted-message placeholder layout

### Verification
- Test a very short message (1–2 words) on mobile width
- Test a medium message that wraps to 2 lines
- Confirm no horizontal scroll or clipped text on any viewport