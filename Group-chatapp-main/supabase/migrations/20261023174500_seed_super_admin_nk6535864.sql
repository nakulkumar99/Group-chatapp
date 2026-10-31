-- ============================================================
-- MIGRATION: Seed super_admin role for nk6535864@gmail.com
-- User ID: b0421fcc-43e5-4671-b745-b1019db5d9dc
-- This uses SECURITY DEFINER to bypass RLS (runs as postgres)
-- ============================================================

-- Step 1: Confirm email so the user can log in immediately
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at       = COALESCE(confirmed_at, now()),
  updated_at         = now()
WHERE id = 'b0421fcc-43e5-4671-b745-b1019db5d9dc';

-- Step 2: Create a one-time SECURITY DEFINER function that runs
--         as the postgres superuser, bypassing all RLS policies.
CREATE OR REPLACE FUNCTION public._seed_super_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert: if the user already has any role, upgrade it to super_admin.
  -- If no row exists, insert a fresh super_admin entry.
  INSERT INTO public.admin_roles (user_id, role, created_by)
  VALUES (
    'b0421fcc-43e5-4671-b745-b1019db5d9dc',
    'super_admin',
    'b0421fcc-43e5-4671-b745-b1019db5d9dc'
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    role       = 'super_admin',
    created_by = 'b0421fcc-43e5-4671-b745-b1019db5d9dc';
END;
$$;

-- Step 3: Execute the seeder function
SELECT public._seed_super_admin();

-- Step 4: Drop the seeder function immediately after use (security hygiene)
DROP FUNCTION public._seed_super_admin();

-- Step 5: Verify the result
DO $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  SELECT ar.role::text, u.email
  INTO v_role, v_email
  FROM public.admin_roles ar
  JOIN auth.users u ON u.id = ar.user_id
  WHERE ar.user_id = 'b0421fcc-43e5-4671-b745-b1019db5d9dc';

  IF v_role = 'super_admin' THEN
    RAISE NOTICE 'SUCCESS: % has been granted super_admin role.', v_email;
  ELSE
    RAISE EXCEPTION 'FAILED: Role not set correctly. Found: %', v_role;
  END IF;
END;
$$;
