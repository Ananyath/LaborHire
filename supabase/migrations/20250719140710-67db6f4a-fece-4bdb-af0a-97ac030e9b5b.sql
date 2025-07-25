-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Employers can view worker profiles" ON public.profiles;

-- Create a security definer function to check user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role::text FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create a better policy that doesn't cause recursion
CREATE POLICY "Employers can view worker profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'worker' AND 
  public.get_user_role(auth.uid()) = 'employer'
);