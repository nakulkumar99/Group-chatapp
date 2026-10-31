
-- Fix 1: Prevent message group_id changes on UPDATE
-- Add a trigger that blocks group_id modification
CREATE OR REPLACE FUNCTION public.prevent_message_group_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.group_id IS DISTINCT FROM OLD.group_id THEN
    RAISE EXCEPTION 'Changing message group_id is not allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_message_group_change
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_message_group_change();

-- Fix 2: Enforce only_admins_can_add_members setting in group_members INSERT policy
DROP POLICY "Users can join non-password groups" ON public.group_members;

CREATE POLICY "Users can join non-password groups"
ON public.group_members FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND NOT EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_members.group_id
    AND groups.has_password = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM groups
    WHERE groups.id = group_members.group_id
    AND (groups.settings->>'only_admins_can_add_members')::boolean = true
  )
);
