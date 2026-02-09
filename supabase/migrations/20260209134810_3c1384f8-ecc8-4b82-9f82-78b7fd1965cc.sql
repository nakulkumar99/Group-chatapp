
-- Add password column to groups table (stored as plain text, hashed in edge function)
ALTER TABLE public.groups ADD COLUMN password text DEFAULT NULL;

-- Don't expose password to clients - create a view or just rely on RLS
-- We'll use an edge function to verify passwords, so clients never see the hash
