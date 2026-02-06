-- Fix is_global_admin function to use SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
    AND role IN ('super_admin', 'admin')
  )
$$;

-- Fix is_super_admin function to use SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
    AND role = 'super_admin'
  )
$$;