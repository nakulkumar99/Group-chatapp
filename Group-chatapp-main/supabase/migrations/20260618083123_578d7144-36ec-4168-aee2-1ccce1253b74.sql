
-- Fix profile_images policies to be scoped to authenticated role
DROP POLICY IF EXISTS "Users can upload their own images" ON public.profile_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON public.profile_images;

CREATE POLICY "Users can upload their own images"
ON public.profile_images FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
ON public.profile_images FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Fix realtime.messages topic subscription bypass
DROP POLICY IF EXISTS "Group members can subscribe to group realtime topics" ON realtime.messages;

-- Add explicit public SELECT policy for profile-images storage bucket
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'profile-images');
