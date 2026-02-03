-- Add unique constraint for upsert operations
ALTER TABLE public.admin_roles 
ADD CONSTRAINT admin_roles_user_id_unique UNIQUE (user_id);

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;

-- Create new policy that allows users to check their own role
CREATE POLICY "Users can view own admin role"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_global_admin(auth.uid()));