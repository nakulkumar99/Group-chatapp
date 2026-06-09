
-- 1. Restrict groups SELECT to members + creator
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;

CREATE POLICY "Members and creators can view groups"
ON public.groups
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_member_of_group(auth.uid(), id)
  OR public.is_global_admin(auth.uid())
);

-- 2. Allow group admins (not just creator) to update group settings
CREATE POLICY "Group admins can update their groups"
ON public.groups
FOR UPDATE
TO authenticated
USING (public.is_group_admin(auth.uid(), id))
WITH CHECK (public.is_group_admin(auth.uid(), id));

-- 3. Replace fuzzy LIKE-based chat-attachments SELECT policy with exact path match
-- Add a canonical storage_path column on messages and backfill from file_url
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS storage_path text;

UPDATE public.messages
SET storage_path = (
  regexp_match(file_url, '/chat-attachments/([^?]+)')
)[1]
WHERE storage_path IS NULL
  AND file_url IS NOT NULL
  AND file_url LIKE '%chat-attachments%';

-- Replace the substring-matching SELECT policy on storage.objects
DROP POLICY IF EXISTS "Chat attachments accessible to owner or group members" ON storage.objects;

CREATE POLICY "Chat attachments accessible to owner or group members"
ON storage.objects
FOR SELECT
TO public
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
