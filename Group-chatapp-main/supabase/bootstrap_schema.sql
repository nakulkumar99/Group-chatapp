-- ============================================================
-- Group Chat App - complete schema for a fresh Supabase project
-- Generated from the application's migrations + src/integrations/supabase/types.ts
-- Idempotent: safe to re-run on the fresh project.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.global_admin_role AS ENUM ('super_admin', 'admin', 'moderator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar_url text,
  bio text,
  status public.user_status DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  settings jsonb DEFAULT '{"only_admins_can_send": false, "only_admins_can_add_members": false}'::jsonb,
  has_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  file_type text,
  file_name text,
  storage_path text,
  edited_at timestamptz DEFAULT NULL,
  deleted_at timestamptz DEFAULT NULL,
  deleted_for_everyone boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by uuid NOT NULL,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, message_id)
);

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  role public.global_admin_role NOT NULL DEFAULT 'moderator',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  banned_by uuid NOT NULL,
  reason text,
  banned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status public.report_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.otp_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.otp_user_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_window UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.group_passwords (
  group_id uuid PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  password text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_phone_data (
  user_id uuid PRIMARY KEY,
  phone_number text,
  phone_verified boolean DEFAULT false,
  phone_verified_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.group_join_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- This table was missing from the migration history but is used by
-- useReadReceipts and the delete-account edge function.
CREATE TABLE IF NOT EXISTS public.message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON public.admin_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans (user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports (status);
CREATE INDEX IF NOT EXISTS idx_content_reports_message_id ON public.content_reports (message_id);
CREATE INDEX IF NOT EXISTS idx_group_join_attempts_user_group ON public.group_join_attempts (user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_group_created ON public.messages (group_id, created_at);
CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads (message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id ON public.message_reads (user_id);

-- Database-level guarantee: at most one super_admin can ever exist.
CREATE UNIQUE INDEX IF NOT EXISTS admin_roles_single_super_admin
  ON public.admin_roles (role) WHERE role = 'super_admin';

-- ------------------------------------------------------------
-- Timestamp + auth trigger functions
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON public.groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Authorization helper functions (SECURITY DEFINER bypasses RLS)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id AND role IN ('super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_global_role(_user_id uuid, _role public.global_admin_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_group_role(_user_id uuid, _group_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND group_id = _group_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups WHERE id = _group_id AND created_by = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_member_of_group(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Public group metadata is visible to authenticated users, but membership
-- rows stay private. This aggregate lets the client display member counts
-- without exposing who belongs to each group.
CREATE OR REPLACE FUNCTION public.get_group_member_counts()
RETURNS TABLE(group_id uuid, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gm.group_id, count(*) AS member_count
  FROM public.group_members gm
  GROUP BY gm.group_id
$$;

-- ------------------------------------------------------------
-- Integrity triggers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_message_group_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    RAISE EXCEPTION 'Changing message group_id is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_message_group_change ON public.messages;
CREATE TRIGGER prevent_message_group_change
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.prevent_message_group_change();

CREATE OR REPLACE FUNCTION public.prevent_username_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_global_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'Username cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_username_change_trigger ON public.profiles;
CREATE TRIGGER prevent_username_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_username_change();

-- Enforce that the only super_admin is the designated account.
-- RLS already restricts writes to a current super_admin; this trigger adds
-- defence-in-depth so even a privileged caller cannot create a second one.
CREATE OR REPLACE FUNCTION public.enforce_super_admin_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NEW.role = 'super_admin' THEN
    SELECT email INTO v_email FROM auth.users WHERE id = NEW.user_id;

    IF v_email IS DISTINCT FROM 'nknakulkumar64@gmail.com' THEN
      RAISE EXCEPTION 'Only the designated super admin account may hold super_admin';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.admin_roles
      WHERE role = 'super_admin' AND user_id <> NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Only one super admin is allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_super_admin_identity ON public.admin_roles;
CREATE TRIGGER enforce_super_admin_identity
  BEFORE INSERT OR UPDATE ON public.admin_roles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_identity();

-- ------------------------------------------------------------
-- Function privileges
-- ------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_message_group_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_username_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_super_admin_identity() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_global_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_global_role(uuid, public.global_admin_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_group_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_member_of_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_group_member_counts() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_global_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_global_role(uuid, public.global_admin_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_group_role(uuid, uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_member_counts() TO authenticated;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_user_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phone_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or direct group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile or direct group member profiles"
  ON public.profiles FOR SELECT TO authenticated
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

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- groups
DROP POLICY IF EXISTS "Authenticated users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Members and creators can view groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can view all groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group admins can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;

CREATE POLICY "Authenticated users can view all groups"
  ON public.groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create groups"
  ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators can update their groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Group admins can update their groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (public.is_group_admin(auth.uid(), id))
  WITH CHECK (public.is_group_admin(auth.uid(), id));

CREATE POLICY "Group creators can delete their groups"
  ON public.groups FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Global admins can update groups"
  ON public.groups FOR UPDATE TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete groups"
  ON public.groups FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- group_members
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view their own groups members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can join non-password groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

CREATE POLICY "Members can view their own groups members"
  ON public.group_members FOR SELECT TO authenticated
  USING (public.is_member_of_group(auth.uid(), group_id));

CREATE POLICY "Global admins can view all group members"
  ON public.group_members FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- Users may self-join groups without a password. The group creator may
-- self-join their own password-protected group during creation. Everyone
-- else must go through the join-group-with-password edge function, which
-- verifies the bcrypt hash with the service role.
CREATE POLICY "Users can join non-password groups"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
        AND groups.has_password = true
        AND groups.created_by <> auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.groups
      WHERE groups.id = group_members.group_id
        AND (groups.settings->>'only_admins_can_add_members')::boolean = true
    )
  );

CREATE POLICY "Users can leave groups"
  ON public.group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Global admins can remove group members"
  ON public.group_members FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- messages
DROP POLICY IF EXISTS "Group members can view messages" ON public.messages;
DROP POLICY IF EXISTS "Group members can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Group members can view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    public.is_member_of_group(auth.uid(), group_id)
    OR public.is_global_admin(auth.uid())
  );

CREATE POLICY "Group members can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_member_of_group(auth.uid(), group_id)
    AND (
      NOT COALESCE(
        (SELECT (settings->>'only_admins_can_send')::boolean FROM public.groups WHERE id = messages.group_id),
        false
      )
      OR public.is_group_admin(auth.uid(), messages.group_id)
    )
  );

CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_member_of_group(auth.uid(), group_id)
  );

CREATE POLICY "Global admins can delete messages"
  ON public.messages FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- profile_images
DROP POLICY IF EXISTS "Users can view all profile images" ON public.profile_images;
DROP POLICY IF EXISTS "Authenticated users can view profile images" ON public.profile_images;
DROP POLICY IF EXISTS "Users can view own or group co-member profile images" ON public.profile_images;
DROP POLICY IF EXISTS "Users can upload their own images" ON public.profile_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON public.profile_images;

CREATE POLICY "Users can view own or group co-member profile images"
  ON public.profile_images FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_global_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.group_members gm1
      WHERE gm1.user_id = auth.uid()
        AND gm1.group_id IN (
          SELECT gm2.group_id FROM public.group_members gm2
          WHERE gm2.user_id = profile_images.user_id
        )
    )
  );

CREATE POLICY "Users can upload their own images"
  ON public.profile_images FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
  ON public.profile_images FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- user_roles
DROP POLICY IF EXISTS "Users can view roles in their groups" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can insert non-admin roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can insert non-admin roles for others" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can update non-self roles" ON public.user_roles;
DROP POLICY IF EXISTS "Group admins can delete non-self roles" ON public.user_roles;

CREATE POLICY "Users can view roles in their groups"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.is_member_of_group(auth.uid(), group_id)
    OR public.is_global_admin(auth.uid())
  );

CREATE POLICY "Group admins can insert non-admin roles for others"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
    AND role <> 'admin'::public.app_role
    AND user_id <> auth.uid()
  );

CREATE POLICY "Group admins can update non-self roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.is_group_admin(auth.uid(), group_id)
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
    AND user_id <> auth.uid()
    AND (role <> 'admin'::public.app_role OR public.is_super_admin(auth.uid()))
  );

CREATE POLICY "Group admins can delete non-self roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.is_group_admin(auth.uid(), group_id)
    AND user_id <> auth.uid()
  );

CREATE POLICY "Global admins can manage group roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

-- message_reactions
DROP POLICY IF EXISTS "Users can view reactions in their groups" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions in their groups"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.group_members gm ON gm.group_id = m.group_id
      WHERE m.id = message_reactions.message_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.group_members gm ON gm.group_id = m.group_id
      WHERE m.id = message_reactions.message_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove their own reactions"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- pinned_messages
DROP POLICY IF EXISTS "Members can view pinned messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "Admins can pin messages" ON public.pinned_messages;
DROP POLICY IF EXISTS "Admins can unpin messages" ON public.pinned_messages;

CREATE POLICY "Members can view pinned messages"
  ON public.pinned_messages FOR SELECT TO authenticated
  USING (public.is_member_of_group(auth.uid(), group_id));

CREATE POLICY "Admins can pin messages"
  ON public.pinned_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = pinned_by
    AND public.is_group_admin(auth.uid(), group_id)
  );

CREATE POLICY "Admins can unpin messages"
  ON public.pinned_messages FOR DELETE TO authenticated
  USING (public.is_group_admin(auth.uid(), group_id));

-- admin_roles
DROP POLICY IF EXISTS "Admins can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can insert admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can update admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins can delete admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can view admin roles" ON public.admin_roles;

CREATE POLICY "Users can view admin roles"
  ON public.admin_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_global_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin roles"
  ON public.admin_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin roles"
  ON public.admin_roles FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin roles"
  ON public.admin_roles FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- audit_logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin(auth.uid()) AND auth.uid() = admin_id);

-- user_bans
DROP POLICY IF EXISTS "Admins can view user bans" ON public.user_bans;
DROP POLICY IF EXISTS "Admins can insert user bans" ON public.user_bans;
DROP POLICY IF EXISTS "Admins can update user bans" ON public.user_bans;
DROP POLICY IF EXISTS "Admins can delete user bans" ON public.user_bans;
DROP POLICY IF EXISTS "Users can view own ban status" ON public.user_bans;

CREATE POLICY "Admins can view user bans"
  ON public.user_bans FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Users can view own ban status"
  ON public.user_bans FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert user bans"
  ON public.user_bans FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin(auth.uid()));

CREATE POLICY "Admins can update user bans"
  ON public.user_bans FOR UPDATE TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Admins can delete user bans"
  ON public.user_bans FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- content_reports
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.content_reports;

CREATE POLICY "Authenticated users can create reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()) OR auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
  ON public.content_reports FOR UPDATE TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Admins can delete reports"
  ON public.content_reports FOR DELETE TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- OTP / rate limit / join attempts: server-side only
DROP POLICY IF EXISTS "Admins can manage OTPs" ON public.otp_verifications;
DROP POLICY IF EXISTS "No direct access to OTP codes" ON public.otp_verifications;
DROP POLICY IF EXISTS "No direct insert to OTP codes" ON public.otp_verifications;
DROP POLICY IF EXISTS "No direct update to OTP codes" ON public.otp_verifications;
DROP POLICY IF EXISTS "No direct delete to OTP codes" ON public.otp_verifications;

CREATE POLICY "No direct access to OTP codes" ON public.otp_verifications FOR SELECT TO authenticated USING (false);
CREATE POLICY "No direct insert to OTP codes" ON public.otp_verifications FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No direct update to OTP codes" ON public.otp_verifications FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No direct delete to OTP codes" ON public.otp_verifications FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct client access to rate limits" ON public.otp_user_rate_limits;
CREATE POLICY "No direct client access to rate limits"
  ON public.otp_user_rate_limits FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client access to join attempts" ON public.group_join_attempts;
CREATE POLICY "No direct client access to join attempts"
  ON public.group_join_attempts FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

-- group_passwords: only creator can write; nobody can read
DROP POLICY IF EXISTS "No direct read access to group passwords" ON public.group_passwords;
DROP POLICY IF EXISTS "Group creators can set password" ON public.group_passwords;
DROP POLICY IF EXISTS "Group creators can update password" ON public.group_passwords;
DROP POLICY IF EXISTS "Group creators can delete password" ON public.group_passwords;

CREATE POLICY "No direct read access to group passwords"
  ON public.group_passwords FOR SELECT TO authenticated USING (false);
CREATE POLICY "Group creators can set password"
  ON public.group_passwords FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.groups WHERE groups.id = group_passwords.group_id AND groups.created_by = auth.uid()
  ));
CREATE POLICY "Group creators can update password"
  ON public.group_passwords FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.groups WHERE groups.id = group_passwords.group_id AND groups.created_by = auth.uid()
  ));
CREATE POLICY "Group creators can delete password"
  ON public.group_passwords FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.groups WHERE groups.id = group_passwords.group_id AND groups.created_by = auth.uid()
  ));

-- user_phone_data
DROP POLICY IF EXISTS "Users can view own phone data" ON public.user_phone_data;
DROP POLICY IF EXISTS "Admins can view all phone data" ON public.user_phone_data;
DROP POLICY IF EXISTS "Super admins can view all phone data" ON public.user_phone_data;
DROP POLICY IF EXISTS "Users can insert own phone data" ON public.user_phone_data;
DROP POLICY IF EXISTS "Users can update own phone data" ON public.user_phone_data;
DROP POLICY IF EXISTS "Admins can update phone data" ON public.user_phone_data;
DROP POLICY IF EXISTS "Super admins can update phone data" ON public.user_phone_data;

CREATE POLICY "Users can view own phone data"
  ON public.user_phone_data FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all phone data"
  ON public.user_phone_data FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Users can insert own phone data"
  ON public.user_phone_data FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own phone data"
  ON public.user_phone_data FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Super admins can update phone data"
  ON public.user_phone_data FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- message_reads
DROP POLICY IF EXISTS "Members can view message read receipts" ON public.message_reads;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;
DROP POLICY IF EXISTS "Users can delete own read receipts" ON public.message_reads;

CREATE POLICY "Members can view message read receipts"
  ON public.message_reads FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.group_members gm ON gm.group_id = m.group_id
      WHERE m.id = message_reads.message_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark messages as read"
  ON public.message_reads FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.group_members gm ON gm.group_id = m.group_id
      WHERE m.id = message_reads.message_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own read receipts"
  ON public.message_reads FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Storage buckets + policies
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-attachments', 'chat-attachments', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Anyone can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "File owners can access chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "File owners can update chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "File owners can delete chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder in chat-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments accessible to owner or group members" ON storage.objects;
DROP POLICY IF EXISTS "Profile images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile images" ON storage.objects;

CREATE POLICY "Chat attachments accessible to owner or group members"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.messages m
        JOIN public.group_members gm ON gm.group_id = m.group_id
        WHERE gm.user_id = auth.uid()
          AND m.storage_path = storage.objects.name
      )
    )
  );

CREATE POLICY "Users can upload to own folder in chat-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "File owners can update chat attachments"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "File owners can delete chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view profile images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'profile-images');

CREATE POLICY "Users can upload their own profile images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own profile images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own profile images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ------------------------------------------------------------
-- Realtime publication + authorization
-- ------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'messages', 'group_members', 'profiles', 'profile_images',
    'message_reactions', 'pinned_messages', 'user_roles', 'groups', 'message_reads'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Note: realtime.messages already has RLS enabled by Supabase and is owned by
-- supabase_realtime_admin, so we only manage the policy here.
DROP POLICY IF EXISTS "Group members can subscribe to group realtime topics" ON realtime.messages;

CREATE POLICY "Group members can subscribe to group realtime topics"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() IS NOT NULL
    AND (
      realtime.topic() NOT LIKE 'group:%'
      OR EXISTS (
        SELECT 1 FROM public.group_members gm
        WHERE gm.user_id = auth.uid()
          AND gm.group_id::text = split_part(realtime.topic(), ':', 2)
      )
    )
  );
