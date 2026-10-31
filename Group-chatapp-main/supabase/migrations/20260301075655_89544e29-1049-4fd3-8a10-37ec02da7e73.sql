
-- Fix 1: Profiles RLS - tighten visibility to direct group members only
DROP POLICY IF EXISTS "Users can view own profile or group member profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or direct group member profiles"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.group_members gm1
    WHERE gm1.user_id = auth.uid()
    AND gm1.group_id IN (
      SELECT gm2.group_id FROM public.group_members gm2
      WHERE gm2.user_id = profiles.user_id
    )
  )
);

-- Fix 2: Restrict phone data to super_admin only (instead of all global admins)
DROP POLICY IF EXISTS "Admins can view all phone data" ON public.user_phone_data;
CREATE POLICY "Super admins can view all phone data"
ON public.user_phone_data FOR SELECT
USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update phone data" ON public.user_phone_data;
CREATE POLICY "Super admins can update phone data"
ON public.user_phone_data FOR UPDATE
USING (is_super_admin(auth.uid()));

-- Fix 3: Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Drop old public SELECT policy on chat-attachments
DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;

-- Add authenticated-only SELECT policy for chat-attachments
CREATE POLICY "Authenticated users can view chat attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL);

-- Fix 4: Per-user OTP rate limiting table
CREATE TABLE IF NOT EXISTS public.otp_user_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_window UNIQUE (user_id)
);

ALTER TABLE public.otp_user_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to rate limits"
ON public.otp_user_rate_limits FOR ALL
USING (false);
