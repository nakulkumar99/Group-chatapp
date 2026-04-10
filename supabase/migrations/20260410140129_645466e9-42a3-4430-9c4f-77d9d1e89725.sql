
-- Create function to check if user is the special Nakul_YT account
CREATE OR REPLACE FUNCTION public.is_nakul_yt(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND username = 'Nakul_YT'
  )
$$;

-- Update admin_roles INSERT policy to allow Nakul_YT
DROP POLICY IF EXISTS "Super admins can insert admin roles" ON public.admin_roles;
CREATE POLICY "Super admins or Nakul_YT can insert admin roles"
ON public.admin_roles
FOR INSERT
TO public
WITH CHECK (is_super_admin(auth.uid()) OR is_nakul_yt(auth.uid()));

-- Update admin_roles UPDATE policy to allow Nakul_YT
DROP POLICY IF EXISTS "Super admins can update admin roles" ON public.admin_roles;
CREATE POLICY "Super admins or Nakul_YT can update admin roles"
ON public.admin_roles
FOR UPDATE
TO public
USING (is_super_admin(auth.uid()) OR is_nakul_yt(auth.uid()));

-- Update admin_roles DELETE policy to allow Nakul_YT
DROP POLICY IF EXISTS "Super admins can delete admin roles" ON public.admin_roles;
CREATE POLICY "Super admins or Nakul_YT can delete admin roles"
ON public.admin_roles
FOR DELETE
TO public
USING (is_super_admin(auth.uid()) OR is_nakul_yt(auth.uid()));

-- Update admin_roles SELECT policy to also allow Nakul_YT to see all roles
DROP POLICY IF EXISTS "Users can view own admin role" ON public.admin_roles;
CREATE POLICY "Users can view admin roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_global_admin(auth.uid()) OR is_nakul_yt(auth.uid()));

-- Also allow Nakul_YT to insert and view audit logs
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;
CREATE POLICY "Admins or Nakul_YT can insert audit logs"
ON public.audit_logs
FOR INSERT
TO public
WITH CHECK ((is_global_admin(auth.uid()) OR is_nakul_yt(auth.uid())) AND auth.uid() = admin_id);

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins or Nakul_YT can view audit logs"
ON public.audit_logs
FOR SELECT
TO public
USING (is_global_admin(auth.uid()) OR is_nakul_yt(auth.uid()));
