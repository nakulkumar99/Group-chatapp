-- Create user status enum
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Add phone columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone_number text UNIQUE,
ADD COLUMN phone_verified boolean DEFAULT false,
ADD COLUMN phone_verified_at timestamptz,
ADD COLUMN status user_status DEFAULT 'active';

-- Create index for phone lookup
CREATE INDEX idx_profiles_phone ON public.profiles(phone_number);

-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on OTP table
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage all OTPs
CREATE POLICY "Admins can manage OTPs" 
ON public.otp_verifications 
FOR ALL 
USING (is_global_admin(auth.uid()));

-- Policy: Admins can read all profiles for user management
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
USING (is_global_admin(auth.uid()));

-- Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (is_global_admin(auth.uid()));