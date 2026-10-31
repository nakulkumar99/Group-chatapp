-- Enable realtime for groups table to sync settings changes across clients
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.groups;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already added, ignore
END $$;