-- Fix: Add WITH CHECK to UPDATE policy preventing admin role escalation
DROP POLICY IF EXISTS "Group admins can update roles" ON public.user_roles;

CREATE POLICY "Group admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (is_group_admin(auth.uid(), group_id))
WITH CHECK (
  is_group_admin(auth.uid(), group_id)
  AND (role != 'admin'::app_role OR is_super_admin(auth.uid()))
);