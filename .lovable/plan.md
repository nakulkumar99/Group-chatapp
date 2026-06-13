The message bubble currently places the time absolutely at the bottom-right, while the message text only has fixed right padding. On short or wrapped messages, the timestamp can collapse into the text area.

Plan:
1. Edit only `src/components/MessageBubble.tsx`.
2. Add a little bottom padding to the bubble so the absolute timestamp has its own visible space.
3. Keep the existing right padding on message text, but make the timestamp slightly more stable with `whitespace-nowrap` so it does not wrap or collide.
4. Do not change message logic, hover actions, emoji reactions, spacing between messages, or any other files.