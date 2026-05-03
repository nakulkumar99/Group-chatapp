
DROP POLICY IF EXISTS "Super admins or Nakul_YT can insert admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins or Nakul_YT can update admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Super admins or Nakul_YT can delete admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Users can view admin roles" ON public.admin_roles;
DROP POLICY IF EXISTS "Admins or Nakul_YT can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins or Nakul_YT can insert audit logs" ON public.audit_logs;

CREATE POLICY "Super admins can insert admin roles" ON public.admin_roles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can update admin roles" ON public.admin_roles FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins can delete admin roles" ON public.admin_roles FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Users can view admin roles" ON public.admin_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_global_admin(auth.uid()));
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_global_admin(auth.uid()));
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_global_admin(auth.uid()) AND auth.uid() = admin_id);

DROP FUNCTION IF EXISTS public.is_nakul_yt(uuid);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);

CREATE OR REPLACE FUNCTION public.prevent_username_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_global_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    RAISE EXCEPTION 'Username cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_username_change_trigger ON public.profiles;
CREATE TRIGGER prevent_username_change_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_username_change();

CREATE TABLE IF NOT EXISTS public.group_join_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL,
  attempt_count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_join_attempts_user_group ON public.group_join_attempts(user_id, group_id);
ALTER TABLE public.group_join_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct client access to join attempts" ON public.group_join_attempts FOR ALL USING (false) WITH CHECK (false);

REVOKE EXECUTE ON FUNCTION public.has_global_role(uuid, global_admin_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_global_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_member_of_group(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_group_role(uuid, uuid, app_role) FROM PUBLIC, anon, authenticated;
