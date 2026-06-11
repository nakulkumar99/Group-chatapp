-- 1) Realtime: only allow group:<uuid> topics, require membership. No implicit allow for other prefixes.
DROP POLICY IF EXISTS "Authenticated users can receive group messages" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_group_messages_select" ON realtime.messages;

CREATE POLICY "realtime_group_messages_select"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IS NOT NULL
  AND realtime.topic() LIKE 'group:%'
  AND public.is_member_of_group(
    auth.uid(),
    NULLIF(substring(realtime.topic() FROM 7), '')::uuid
  )
);

-- 2) Storage: drop the {public}-role DELETE policy on chat-attachments.
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
