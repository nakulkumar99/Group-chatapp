
-- Fix 1: Message UPDATE policy - prevent group_id injection
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.is_member_of_group(auth.uid(), group_id)
);

-- Fix 2: user_roles - prevent admin self-escalation
-- Drop the overly broad ALL policy
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Admins can view roles in their group (already covered by existing SELECT policy, but needed for ALL replacement)
CREATE POLICY "Group admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Group admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.is_group_admin(auth.uid(), group_id));

-- Admins can only insert non-admin roles (prevents self-escalation)
CREATE POLICY "Group admins can insert non-admin roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  public.is_group_admin(auth.uid(), group_id)
  AND role != 'admin'::app_role
);
