-- Add job_id column to messages table for job context
ALTER TABLE public.messages ADD COLUMN job_id UUID;

-- Create index for better performance
CREATE INDEX idx_messages_job_id ON public.messages(job_id);

-- Create function to consolidate conversations between same users
CREATE OR REPLACE FUNCTION public.consolidate_user_conversations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_pair RECORD;
  primary_conversation_id UUID;
  conversations_to_merge UUID[];
BEGIN
  -- Find all user pairs that have multiple conversations
  FOR conversation_pair IN
    SELECT 
      LEAST(participant_1, participant_2) as user1,
      GREATEST(participant_1, participant_2) as user2,
      array_agg(id ORDER BY created_at) as conversation_ids,
      COUNT(*) as conversation_count
    FROM public.conversations
    WHERE participant_1 != participant_2
    GROUP BY LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2)
    HAVING COUNT(*) > 1
  LOOP
    -- Use the oldest conversation as primary (first in array)
    primary_conversation_id := conversation_pair.conversation_ids[1];
    conversations_to_merge := conversation_pair.conversation_ids[2:];
    
    -- Update the primary conversation to be general (no job_id)
    UPDATE public.conversations 
    SET job_id = NULL,
        updated_at = now()
    WHERE id = primary_conversation_id;
    
    -- Move all messages from other conversations to the primary one
    -- and preserve job context in the message
    FOR i IN 1..array_length(conversations_to_merge, 1)
    LOOP
      -- First, update job_id in messages based on the conversation's job_id
      UPDATE public.messages 
      SET job_id = (
        SELECT c.job_id 
        FROM public.conversations c 
        WHERE c.id = conversations_to_merge[i]
      )
      WHERE conversation_id = conversations_to_merge[i];
      
      -- Then move messages to primary conversation
      UPDATE public.messages 
      SET conversation_id = primary_conversation_id
      WHERE conversation_id = conversations_to_merge[i];
    END LOOP;
    
    -- Delete the merged conversations
    DELETE FROM public.conversations 
    WHERE id = ANY(conversations_to_merge);
    
    -- Update the primary conversation's last_message_at
    UPDATE public.conversations
    SET last_message_at = (
      SELECT MAX(created_at) 
      FROM public.messages 
      WHERE conversation_id = primary_conversation_id
    )
    WHERE id = primary_conversation_id;
  END LOOP;
END;
$$;

-- Run the consolidation
SELECT public.consolidate_user_conversations();