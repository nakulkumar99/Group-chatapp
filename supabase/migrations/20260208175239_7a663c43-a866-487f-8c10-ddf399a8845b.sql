-- Fix 2: Replace overly broad ALL policy on otp_verifications with restrictive policies
-- OTP records should only be managed by the system (service role) via edge functions
DROP POLICY IF EXISTS "Admins can manage OTPs" ON public.otp_verifications;

-- Deny all direct access - edge functions use service role key which bypasses RLS
CREATE POLICY "No direct access to OTP codes"
ON public.otp_verifications FOR SELECT
USING (false);

CREATE POLICY "No direct insert to OTP codes"
ON public.otp_verifications FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update to OTP codes"
ON public.otp_verifications FOR UPDATE
USING (false);

CREATE POLICY "No direct delete to OTP codes"
ON public.otp_verifications FOR DELETE
USING (false);