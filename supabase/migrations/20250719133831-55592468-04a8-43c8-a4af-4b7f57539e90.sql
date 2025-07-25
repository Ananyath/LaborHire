-- Add policy to allow employers to view worker profiles
CREATE POLICY "Employers can view worker profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'worker' AND 
  auth.uid() IN (
    SELECT user_id FROM public.profiles WHERE role = 'employer'
  )
);