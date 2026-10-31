-- Create role enum for admin controls
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'member');

-- Create user_roles table for group-level roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies for user_roles
CREATE POLICY "Users can view roles in their groups"
ON public.user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = user_roles.group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.group_id = user_roles.group_id
    AND ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_group_role(_user_id UUID, _group_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role = _role
  )
$$;

-- Function to check if user is admin or group creator
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
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

-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

-- Enable RLS on message_reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for message_reactions
CREATE POLICY "Users can view reactions in their groups"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN group_members gm ON gm.group_id = m.group_id
    WHERE m.id = message_reactions.message_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM messages m
    JOIN group_members gm ON gm.group_id = m.group_id
    WHERE m.id = message_reactions.message_id
    AND gm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Create pinned_messages table for announcements
CREATE TABLE public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (group_id, message_id)
);

-- Enable RLS on pinned_messages
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;

-- Policies for pinned_messages
CREATE POLICY "Members can view pinned messages"
ON public.pinned_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = pinned_messages.group_id
    AND group_members.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can pin messages"
ON public.pinned_messages FOR INSERT
WITH CHECK (
  auth.uid() = pinned_by AND
  public.is_group_admin(auth.uid(), group_id)
);

CREATE POLICY "Admins can unpin messages"
ON public.pinned_messages FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));

-- Add settings column to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{"only_admins_can_send": false, "only_admins_can_add_members": false}'::jsonb;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;