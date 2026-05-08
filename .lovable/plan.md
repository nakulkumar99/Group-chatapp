# Fix Chat Area Right-Side Empty Gap

## Problem
The chat column is centered with a max-width ladder (`max-w-2xl … 2xl:max-w-6xl` + `mx-auto`). On wide screens this leaves a large empty area on the right side of the messages list (visible as the yellow lines in the screenshot), while the left edge starts where avatars/usernames sit. The user wants the chat to fill the full available width with consistent right padding.

## Changes

### 1. `src/index.css` — `.chat-column`
Replace the centered max-width ladder with a full-width container that only adds horizontal padding, so messages span the entire chat area edge-to-edge:

- Before: `mx-auto w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl`
- After: `w-full max-w-none`

This removes the centering cap that creates the right-side gap. The existing `px-*` padding on each `chat-column` usage already handles left/right spacing.

### 2. `src/components/MessageBubble.tsx`
Keep bubbles from stretching across the now-wider container by tightening the per-bubble max-width ladder so own/other bubbles still look balanced and compact:

- Both branches (line 302 and line 343): change
  `max-w-[85%] sm:max-w-[75%] md:max-w-[68%] lg:max-w-[60%] xl:max-w-[55%]`
  to
  `max-w-[85%] sm:max-w-[70%] md:max-w-[60%] lg:max-w-[50%] xl:max-w-[45%]`

This keeps individual bubble widths comfortable while the row itself fills the full chat width, eliminating the right-side empty gap shown in the screenshot.

### 3. `src/components/layout/ChatArea.tsx`
No structural change. Verify the three `chat-column` usages (header line 284, messages line 430, input line 488) keep their existing `px-*` padding so left and right padding stay consistent.

## Out of scope
- No changes to message grouping, avatars, typing indicator, colors, or any backend/business logic.
