
-- ========================================================
-- Fix 1: Groups password exposure
-- Move passwords to a separate locked-down table
-- ========================================================

-- Create group_passwords table with no client SELECT access
CREATE TABLE public.group_passwords (
  group_id uuid PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  password text NOT NULL
);

ALTER TABLE public.group_passwords ENABLE ROW LEVEL SECURITY;

-- Block all client access - only service_role (edge functions) can read
CREATE POLICY "No direct read access to group passwords"
  ON public.group_passwords FOR SELECT USING (false);
CREATE POLICY "Group creators can set password"
  ON public.group_passwords FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups WHERE id = group_passwords.group_id AND created_by = auth.uid()));
CREATE POLICY "Group creators can update password"
  ON public.group_passwords FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.groups WHERE id = group_passwords.group_id AND created_by = auth.uid()));
CREATE POLICY "Group creators can delete password"
  ON public.group_passwords FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.groups WHERE id = group_passwords.group_id AND created_by = auth.uid()));

-- Add has_password boolean to groups (safe for clients to see)
ALTER TABLE public.groups ADD COLUMN has_password boolean NOT NULL DEFAULT false;

-- Migrate existing passwords
INSERT INTO public.group_passwords (group_id, password)
SELECT id, password FROM public.groups WHERE password IS NOT NULL;

-- Set has_password for existing groups
UPDATE public.groups SET has_password = true WHERE password IS NOT NULL;

-- Drop the password column from groups
ALTER TABLE public.groups DROP COLUMN password;


-- ========================================================
-- Fix 2: Profiles phone number exposure
-- Move phone data to a separate table with strict RLS
-- ========================================================

-- Create user_phone_data table
CREATE TABLE public.user_phone_data (
  user_id uuid PRIMARY KEY,
  phone_number text,
  phone_verified boolean DEFAULT false,
  phone_verified_at timestamptz
);

ALTER TABLE public.user_phone_data ENABLE ROW LEVEL SECURITY;

-- Only the owner can see their own phone data
CREATE POLICY "Users can view own phone data"
  ON public.user_phone_data FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can see all phone data
CREATE POLICY "Admins can view all phone data"
  ON public.user_phone_data FOR SELECT
  USING (is_global_admin(auth.uid()));

-- Only owner can insert/update their phone data
CREATE POLICY "Users can insert own phone data"
  ON public.user_phone_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone data"
  ON public.user_phone_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update phone data
CREATE POLICY "Admins can update phone data"
  ON public.user_phone_data FOR UPDATE
  USING (is_global_admin(auth.uid()));

-- Migrate existing phone data from profiles
INSERT INTO public.user_phone_data (user_id, phone_number, phone_verified, phone_verified_at)
SELECT user_id, phone_number, phone_verified, phone_verified_at
FROM public.profiles
WHERE phone_number IS NOT NULL OR phone_verified = true;

-- Drop phone columns from profiles
ALTER TABLE public.profiles DROP COLUMN phone_number;
ALTER TABLE public.profiles DROP COLUMN phone_verified;
ALTER TABLE public.profiles DROP COLUMN phone_verified_at;
