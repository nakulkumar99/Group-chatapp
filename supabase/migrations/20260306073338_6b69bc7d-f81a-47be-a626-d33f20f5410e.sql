
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;

CREATE POLICY "Users can join non-password groups"
ON public.group_members FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  NOT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = group_id AND has_password = true
  )
);
