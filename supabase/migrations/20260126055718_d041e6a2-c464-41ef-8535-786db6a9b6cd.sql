-- Add update policy for messages to allow users to edit their own messages
CREATE POLICY "Users can update their own messages" 
ON public.messages 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add edited_at column to track when messages were edited
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;