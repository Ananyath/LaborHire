-- Create conversations table to track chat sessions between users
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  job_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(participant_1, participant_2, job_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_text TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their conversations" 
ON public.conversations 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = participant_1
  ) OR 
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = participant_2
  )
);

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = participant_1
  ) OR 
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = participant_2
  )
);

CREATE POLICY "Users can update their conversations" 
ON public.conversations 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = participant_1
  ) OR 
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = participant_2
  )
);

-- RLS policies for messages
CREATE POLICY "Users can view their messages" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = sender_id
  ) OR 
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = receiver_id
  )
);

CREATE POLICY "Users can create messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = sender_id
  )
);

CREATE POLICY "Users can update their received messages" 
ON public.messages 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = receiver_id
  )
);

-- Add indexes for better performance
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1, participant_2);
CREATE INDEX idx_conversations_job ON public.conversations(job_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Create function to update conversation timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations 
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation timestamp when new message is sent
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_timestamp();

-- Enable realtime for messages and conversations
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;