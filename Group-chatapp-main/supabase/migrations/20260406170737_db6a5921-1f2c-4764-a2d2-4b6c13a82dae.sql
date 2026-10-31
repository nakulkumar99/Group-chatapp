-- Fix: restrict chat-attachments SELECT to file owner only
-- Signed URLs shared in messages (RLS-protected) provide access to other group members
DROP POLICY IF EXISTS "Authenticated users can access their chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;

-- Only the uploader can generate signed URLs for their files
CREATE POLICY "File owners can access chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);