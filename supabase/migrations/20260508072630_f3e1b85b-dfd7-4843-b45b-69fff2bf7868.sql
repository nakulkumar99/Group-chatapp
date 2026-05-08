
-- Fix chat-attachments SELECT policy to use exact path match instead of substring POSITION
DROP POLICY IF EXISTS "Chat attachments accessible to owner or group members" ON storage.objects;

CREATE POLICY "Chat attachments accessible to owner or group members"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1
      FROM messages m
      JOIN group_members gm ON gm.group_id = m.group_id
      WHERE gm.user_id = auth.uid()
        AND m.file_url IS NOT NULL
        AND (
          m.file_url = objects.name
          OR m.file_url LIKE '%/' || objects.name
          OR m.file_url LIKE '%/storage/v1/object/%/' || objects.name
          OR m.file_url LIKE '%/storage/v1/object/%/' || objects.name || '?%'
        )
    )
  )
);

-- Restrict direct client writes to group_passwords; only edge function (service role) may write hashed passwords
DROP POLICY IF EXISTS "Group creators can set password" ON public.group_passwords;
DROP POLICY IF EXISTS "Group creators can update password" ON public.group_passwords;
DROP POLICY IF EXISTS "Group creators can delete password" ON public.group_passwords;

CREATE POLICY "No direct client insert to group passwords"
ON public.group_passwords
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct client update to group passwords"
ON public.group_passwords
FOR UPDATE
USING (false);

CREATE POLICY "No direct client delete to group passwords"
ON public.group_passwords
FOR DELETE
USING (false);
