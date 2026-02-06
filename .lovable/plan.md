
# Delete My Message & Scroll to Bottom Button Implementation

## Overview

This plan implements two features:
1. **Delete Message** - "Delete for me" or "Delete for everyone" (within 5 min) with "Message deleted" placeholder
2. **Scroll to Bottom Button** - Shows when scrolled up with unread count badge and smooth scroll

---

## Feature 1: Delete My Message

### Database Changes

Add two new columns to the `messages` table:

```sql
-- Add deletion columns to messages table
ALTER TABLE public.messages 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN deleted_for_everyone boolean DEFAULT false;
```

Update RLS policy to allow users to update their own messages for deletion:

```sql
-- The existing UPDATE policy already allows: auth.uid() = user_id
-- No additional policy needed
```

### File: `src/hooks/useMessages.ts` (MODIFY)

Add delete functionality:

```text
New functions:
- deleteForMe(messageId): Sets deleted_at for local filtering only
- deleteForEveryone(messageId): Sets deleted_at and deleted_for_everyone=true
  - Only allowed within 5 minutes of message creation

Changes:
- Update fetchMessages to filter out messages deleted_for_me by current user
- Add realtime listener for UPDATE events to handle deletions
- Local state: Track user's deleted message IDs for "delete for me"
```

### File: `src/components/MessageBubble.tsx` (MODIFY)

Add delete UI and "Message deleted" placeholder:

```text
New imports:
- Trash2 icon
- DropdownMenu components
- AlertDialog for confirmation

New props:
- onDelete: (messageId: string, forEveryone: boolean) => void
- isDeleted: boolean
- deletedForEveryone: boolean

UI Changes:
1. Add Trash icon in action buttons (visible for own messages)
2. Show dropdown menu on click:
   - "Delete for me" (always available)
   - "Delete for everyone" (only if within 5 min)
3. Show "Message deleted" placeholder for deleted messages:
   - Gray italicized text: "🚫 This message was deleted"
   - No reactions, no actions, minimal styling
```

### File: `src/components/layout/ChatArea.tsx` (MODIFY)

Pass delete handler to MessageBubble:

```text
Changes:
- Get deleteMessage function from useMessages
- Pass onDelete prop to MessageBubble
- Handle deleted message display logic
```

---

## Feature 2: Scroll to Bottom Button

### File: `src/components/layout/ChatArea.tsx` (MODIFY)

Add scroll detection and button:

```text
New state:
- showScrollButton: boolean
- unreadBelowCount: number
- scrollAreaRef: ref to access ScrollArea viewport

New imports:
- ArrowDown icon

New logic:
1. Track scroll position using onScroll event
2. If scrolled up > 200px from bottom, show button
3. Count new messages that arrived while scrolled up
4. Reset unread count when scrolling to bottom

New UI:
- Floating button at bottom-right of messages area
- Badge showing unread count (if > 0)
- Smooth scroll animation on click
```

### Component: Scroll to Bottom Button

```text
Position: fixed bottom-20 right-4 (above chat input)
Style:
  - Circular button with ArrowDown icon
  - Primary background
  - Badge in top-right corner for unread count
  - Animate in/out with framer-motion

Behavior:
  - onClick: scrollTo bottom with smooth behavior
  - Badge shows count of messages received while scrolled up
```

---

## Implementation Flow

### Delete Message Flow

```text
User clicks trash icon
        │
        ▼
   Show dropdown
   ┌─────────────────────────┐
   │ Delete for me           │
   │ Delete for everyone     │ ← Only if < 5 min old
   └─────────────────────────┘
        │
        ▼
   Confirmation modal
   "Delete this message?"
        │
        ▼
  ┌─────┴─────┐
  │           │
  ▼           ▼
For Me     For Everyone
  │           │
  ▼           ▼
Local      Database
state      update
only       + realtime
           broadcast
```

### Scroll Button Flow

```text
User scrolls up
        │
        ▼
  Distance > 200px?
        │
    ┌───┴───┐
    │       │
    No     Yes
    │       │
    ▼       ▼
  Hide    Show
button   button
           │
           ▼
    New message arrives
           │
           ▼
    Increment badge
           │
           ▼
    User clicks button
           │
           ▼
    Smooth scroll + reset badge
```

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/...` | CREATE | Add deleted_at, deleted_for_everyone columns |
| `src/hooks/useMessages.ts` | MODIFY | Add delete functions, filter deleted messages |
| `src/components/MessageBubble.tsx` | MODIFY | Add delete UI, show deleted placeholder |
| `src/components/layout/ChatArea.tsx` | MODIFY | Add scroll button, pass delete handler |

---

## UI Preview

### Deleted Message Placeholder
```text
┌─────────────────────────────────────────┐
│ 🚫 This message was deleted             │
│                              12:34 PM   │
└─────────────────────────────────────────┘
```

### Scroll to Bottom Button
```text
                    ┌───┐
                    │ 3 │ ← Unread badge
              ┌─────┴───┴─────┐
              │       ↓       │
              │   (Arrow)     │
              └───────────────┘
```

### Delete Dropdown Menu
```text
┌─────────────────────────┐
│ 🗑️ Delete for me        │
├─────────────────────────┤
│ 🗑️ Delete for everyone  │ ← Red text, only if < 5 min
└─────────────────────────┘
```

---

## Time Check Logic (5 min rule)

```typescript
const canDeleteForEveryone = (createdAt: string): boolean => {
  const fiveMinutesMs = 5 * 60 * 1000;
  const messageTime = new Date(createdAt).getTime();
  const now = Date.now();
  return now - messageTime <= fiveMinutesMs;
};
```

---

## Edge Cases Handled

1. **Delete for everyone after 5 min**: Button disabled/hidden
2. **Deleted message reactions**: Hidden along with message
3. **Scroll button position**: Above chat input, responsive
4. **Realtime deletion**: Other users see "Message deleted" instantly
5. **Delete for me**: Only affects local user, others still see message
