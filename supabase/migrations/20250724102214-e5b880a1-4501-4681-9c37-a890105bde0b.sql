-- Complete fix for infinite recursion in RLS policies

-- Drop ALL problematic policies that cause circular dependencies
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view worker profiles" ON public.profiles;

-- Create new safe policies that avoid circular dependencies
-- Policy for conversation participants - uses auth.uid() directly in subqueries
CREATE POLICY "Users can view profiles of conversation participants" 
ON public.profiles FOR SELECT 
USING (
  id IN (
    SELECT participant_1 FROM public.conversations 
    WHERE participant_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    UNION
    SELECT participant_2 FROM public.conversations 
    WHERE participant_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Policy for employers viewing workers - uses auth.uid() directly without function calls
CREATE POLICY "Employers can view worker profiles" 
ON public.profiles FOR SELECT 
USING (
  role = 'worker'::user_role 
  AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'employer'::user_role
  )
);