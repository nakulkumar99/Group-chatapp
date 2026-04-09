-- Allow banned users to view their own ban record
CREATE POLICY "Users can view own ban status"
ON public.user_bans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);