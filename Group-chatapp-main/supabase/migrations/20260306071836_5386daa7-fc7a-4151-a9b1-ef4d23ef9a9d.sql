
DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.group_members;

CREATE POLICY "Members can view their own groups members"
ON public.group_members FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm
    WHERE gm.group_id = group_members.group_id
    AND gm.user_id = auth.uid()
  )
);
