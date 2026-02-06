-- Add deletion columns to messages table
ALTER TABLE public.messages 
ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL,
ADD COLUMN deleted_for_everyone boolean DEFAULT false;