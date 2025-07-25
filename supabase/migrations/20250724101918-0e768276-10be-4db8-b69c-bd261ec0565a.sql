-- Fix infinite recursion in RLS policies - PROPER FIX

-- Drop the still problematic policy
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;

-- Create a security definer function to get current user's profile ID safely
CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS and avoid recursion
  RETURN (SELECT id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1);
END;
$$;

-- Create the corrected policy using the security definer function
CREATE POLICY "Users can view profiles of conversation participants" 
ON public.profiles FOR SELECT 
USING (
  profiles.id IN (
    SELECT participant_1 FROM public.conversations 
    WHERE participant_2 = public.get_current_user_profile_id()
    UNION
    SELECT participant_2 FROM public.conversations 
    WHERE participant_1 = public.get_current_user_profile_id()
  )
);