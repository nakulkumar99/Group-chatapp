-- Remove broad SELECT policy that overrides the owner-scoped one
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;

-- Remove broad INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload chat attachments" ON storage.objects;

-- Create owner-scoped INSERT policy
CREATE POLICY "Users can upload to own folder in chat-attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);