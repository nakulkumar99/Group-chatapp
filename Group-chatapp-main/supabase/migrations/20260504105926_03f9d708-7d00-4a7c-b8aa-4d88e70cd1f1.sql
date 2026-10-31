
-- 1. Chat attachments: replace owner-only SELECT with owner OR group-member access
DROP POLICY IF EXISTS "File owners can access chat attachments" ON storage.objects;

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
        AND m.file_url IS NOT NULL
        AND position(name in m.file_url) > 0
    )
  )
);

-- 2. profile_images: restrict to owner or group co-members
DROP POLICY IF EXISTS "Authenticated users can view profile images" ON public.profile_images;

CREATE POLICY "Users can view own or group co-member profile images"
ON public.profile_images
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_members gm1
    WHERE gm1.user_id = auth.uid()
      AND gm1.group_id IN (
        SELECT gm2.group_id FROM public.group_members gm2
        WHERE gm2.user_id = profile_images.user_id
      )
  )
);

-- 3. user_roles: prevent group admins from modifying their own role record or assigning admin to self
DROP POLICY IF EXISTS "Group admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can insert non-admin roles" ON public.user_roles;

CREATE POLICY "Group admins can insert non-admin roles for others"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_group_admin(auth.uid(), group_id)
  AND role <> 'admin'::app_role
  AND user_id <> auth.uid()
);

CREATE POLICY "Group admins can update non-self roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  is_group_admin(auth.uid(), group_id)
  AND user_id <> auth.uid()
)
WITH CHECK (
  is_group_admin(auth.uid(), group_id)
  AND user_id <> auth.uid()
  AND (role <> 'admin'::app_role OR is_super_admin(auth.uid()))
);

CREATE POLICY "Group admins can delete non-self roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  is_group_admin(auth.uid(), group_id)
  AND user_id <> auth.uid()
);

-- 4. Realtime authorization: only group members can subscribe to per-group topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can subscribe to group realtime topics" ON realtime.messages;

CREATE POLICY "Group members can subscribe to group realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow general postgres_changes subscriptions (no specific topic) and group-scoped channels for members
  (realtime.topic() IS NULL)
  OR (realtime.topic() NOT LIKE 'group:%')
  OR EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.user_id = auth.uid()
      AND gm.group_id::text = split_part(realtime.topic(), ':', 2)
  )
);
