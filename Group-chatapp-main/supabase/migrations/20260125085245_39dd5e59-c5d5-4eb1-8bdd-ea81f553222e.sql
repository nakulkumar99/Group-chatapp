-- Fix security: Require authentication for viewing profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Fix security: Require authentication for viewing groups
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
CREATE POLICY "Authenticated users can view groups" 
ON public.groups 
FOR SELECT 
TO authenticated
USING (true);

-- Fix security: Require authentication for viewing group members
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Authenticated users can view group members" 
ON public.group_members 
FOR SELECT 
TO authenticated
USING (true);

-- Fix security: Require authentication for viewing profile images
DROP POLICY IF EXISTS "Users can view all profile images" ON public.profile_images;
CREATE POLICY "Authenticated users can view profile images" 
ON public.profile_images 
FOR SELECT 
TO authenticated
USING (true);