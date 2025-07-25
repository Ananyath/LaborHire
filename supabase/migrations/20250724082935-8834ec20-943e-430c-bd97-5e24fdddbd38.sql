-- Fix infinite recursion in RLS policies

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;

-- Drop the problematic function that causes circular dependency
DROP FUNCTION IF EXISTS public.get_current_user_profile_id();

-- Create a corrected policy that avoids circular reference
CREATE POLICY "Users can view profiles of conversation participants" 
ON public.profiles FOR SELECT 
USING (
  profiles.id IN (
    SELECT participant_1 FROM public.conversations 
    WHERE participant_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    UNION
    SELECT participant_2 FROM public.conversations 
    WHERE participant_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);