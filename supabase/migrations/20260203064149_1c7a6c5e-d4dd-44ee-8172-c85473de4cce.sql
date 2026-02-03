-- Add DELETE policy for messages (admin moderation)
CREATE POLICY "Admins can delete any message"
ON public.messages
FOR DELETE
USING (is_global_admin(auth.uid()));

-- Add unique constraint for user_roles to enable upsert
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_group_user_unique UNIQUE (group_id, user_id);