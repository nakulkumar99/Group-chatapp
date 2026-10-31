-- Enforce only_admins_can_send setting at the database level
DROP POLICY IF EXISTS "Group members can send messages" ON messages;
CREATE POLICY "Group members can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = messages.group_id AND user_id = auth.uid()
  )
  AND (
    NOT COALESCE((SELECT (settings->>'only_admins_can_send')::boolean FROM groups WHERE id = messages.group_id), false)
    OR is_group_admin(auth.uid(), messages.group_id)
  )
);