
-- 1. Restrict chat-attachments storage policies to authenticated role only

-- SELECT: drop existing public-role policy and recreate for authenticated
DROP POLICY IF EXISTS "Chat attachments accessible to owner or group members" ON storage.objects;

CREATE POLICY "Chat attachments accessible to owner or group members"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.group_members gm ON gm.group_id = m.group_id
      WHERE gm.user_id = auth.uid()
        AND m.storage_path = storage.objects.name
    )
  )
);

-- INSERT: recreate restricted to authenticated
DROP POLICY IF EXISTS "Users can upload to own folder in chat-attachments" ON storage.objects;

CREATE POLICY "Users can upload to own folder in chat-attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE: already authenticated, re-assert defensively
DROP POLICY IF EXISTS "File owners can update chat attachments" ON storage.objects;

CREATE POLICY "File owners can update chat attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- DELETE: restrict deletes to file owner (authenticated)
DROP POLICY IF EXISTS "File owners can delete chat attachments" ON storage.objects;

CREATE POLICY "File owners can delete chat attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Realtime: remove NULL-topic bypass so group membership is always enforced for group:* topics
DROP POLICY IF EXISTS "Group members can subscribe to group realtime topics" ON realtime.messages;

CREATE POLICY "Group members can subscribe to group realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IS NOT NULL
  AND (
    realtime.topic() NOT LIKE 'group:%'
    OR EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.user_id = auth.uid()
        AND gm.group_id::text = split_part(realtime.topic(), ':', 2)
    )
  )
);
