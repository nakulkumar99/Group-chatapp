
-- Create SECURITY DEFINER function to check membership without RLS recursion
CREATE OR REPLACE FUNCTION public.is_member_of_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Secure the function
REVOKE EXECUTE ON FUNCTION public.is_member_of_group FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_of_group TO authenticated;

-- Replace the recursive SELECT policy on group_members
DROP POLICY "Members can view their own groups members" ON public.group_members;

CREATE POLICY "Members can view their own groups members"
ON public.group_members FOR SELECT TO authenticated
USING (public.is_member_of_group(auth.uid(), group_id));
