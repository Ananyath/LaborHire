
-- Drop the problematic policy that references auth.users directly
DROP POLICY IF EXISTS "Employers can view worker profiles" ON public.profiles;

-- Create a new policy that uses the existing get_user_role function
CREATE POLICY "Employers can view worker profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'worker' AND 
  public.get_user_role(auth.uid()) = 'employer'
);
