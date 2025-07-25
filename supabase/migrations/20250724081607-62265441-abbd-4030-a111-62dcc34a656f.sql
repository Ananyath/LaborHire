-- Create security definer function to get current user's profile id
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT id FROM public.profiles WHERE user_id = auth.uid());
END;
$$;

-- Add RLS policy to allow users to view profiles of conversation participants
CREATE POLICY "Users can view profiles of conversation participants" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE (participant_1 = public.get_current_user_profile_id() AND participant_2 = profiles.id)
       OR (participant_2 = public.get_current_user_profile_id() AND participant_1 = profiles.id)
  )
);