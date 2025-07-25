
-- Update the profiles table RLS policy to allow viewing basic profile info for conversation participants
-- This is needed so users can see the names and photos of people they're chatting with
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.profiles;

CREATE POLICY "Users can view conversation participants" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can view their own profile
  user_id = auth.uid() 
  OR 
  -- Users can view profiles of people they have conversations with
  id IN (
    SELECT DISTINCT 
      CASE 
        WHEN participant_1 = get_current_user_profile_id() THEN participant_2
        WHEN participant_2 = get_current_user_profile_id() THEN participant_1
      END
    FROM public.conversations
    WHERE participant_1 = get_current_user_profile_id() OR participant_2 = get_current_user_profile_id()
  )
  OR
  -- Admins can view all profiles (keep existing admin access)
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE admin_profiles.user_id = auth.uid()
  )
);

-- Enable realtime for messages table to get instant updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

-- Add messages and conversations to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
