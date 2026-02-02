-- Create enum for global admin roles
CREATE TYPE public.global_admin_role AS ENUM ('super_admin', 'admin', 'moderator');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed', 'dismissed');

-- Create admin_roles table for global admin privileges
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role global_admin_role NOT NULL DEFAULT 'moderator',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id)
);

-- Create audit_logs table to track admin actions
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_bans table
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id)
);

-- Create content_reports table
CREATE TABLE public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create is_global_admin function
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
    AND role IN ('super_admin', 'admin')
  )
$$;

-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
    AND role = 'super_admin'
  )
$$;

-- Create has_global_role function
CREATE OR REPLACE FUNCTION public.has_global_role(_user_id UUID, _role global_admin_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- Enable RLS on all new tables
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_roles
CREATE POLICY "Admins can view admin roles"
ON public.admin_roles
FOR SELECT
USING (is_global_admin(auth.uid()));

CREATE POLICY "Super admins can insert admin roles"
ON public.admin_roles
FOR INSERT
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update admin roles"
ON public.admin_roles
FOR UPDATE
USING (is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete admin roles"
ON public.admin_roles
FOR DELETE
USING (is_super_admin(auth.uid()));

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (is_global_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (is_global_admin(auth.uid()) AND auth.uid() = admin_id);

-- RLS Policies for user_bans
CREATE POLICY "Admins can view user bans"
ON public.user_bans
FOR SELECT
USING (is_global_admin(auth.uid()));

CREATE POLICY "Admins can insert user bans"
ON public.user_bans
FOR INSERT
WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Admins can update user bans"
ON public.user_bans
FOR UPDATE
USING (is_global_admin(auth.uid()));

CREATE POLICY "Admins can delete user bans"
ON public.user_bans
FOR DELETE
USING (is_global_admin(auth.uid()));

-- RLS Policies for content_reports
CREATE POLICY "Authenticated users can create reports"
ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all reports"
ON public.content_reports
FOR SELECT
USING (is_global_admin(auth.uid()) OR auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
ON public.content_reports
FOR UPDATE
USING (is_global_admin(auth.uid()));

CREATE POLICY "Admins can delete reports"
ON public.content_reports
FOR DELETE
USING (is_global_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_admin_roles_user_id ON public.admin_roles(user_id);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX idx_content_reports_status ON public.content_reports(status);
CREATE INDEX idx_content_reports_message_id ON public.content_reports(message_id);