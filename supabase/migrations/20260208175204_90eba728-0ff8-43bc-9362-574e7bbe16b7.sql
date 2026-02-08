-- Fix 1: Restrict profiles SELECT to own profile + group members
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create restricted policy: users can view own profile or profiles of group members
CREATE POLICY "Users can view own profile or group member profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_members gm1
    JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
    AND gm2.user_id = profiles.user_id
  )
  OR is_global_admin(auth.uid())
);