## What's happening

In `src/components/MessageBubble.tsx`, when you hover a message, the action bar (emoji picker, edit, pin, delete) appears. The wrapper div uses `mt-8` only while actions are visible:

```
className={`relative group ${actionsVisible && !isEditing ? "mt-8" : ""}`}
```

This conditional margin is added/removed on every hover-in/out, which pushes the bubble down and causes the visible "shutter"/layout shift. The action bar itself is `absolute -top-8`, so it already floats above the bubble and does not need extra space reserved.

## Fix

Edit `src/components/MessageBubble.tsx` (the wrapper around line ~349):

- Remove the `${actionsVisible && !isEditing ? "mt-8" : ""}` part so the class becomes simply `relative group`.

No other changes. The absolute-positioned action bar will overlay above the bubble on hover without shifting any layout.

## Scope

- File: `src/components/MessageBubble.tsx` only
- Lines: the wrapper `div` className expression
- No logic, no styles elsewhere, no new dependencies