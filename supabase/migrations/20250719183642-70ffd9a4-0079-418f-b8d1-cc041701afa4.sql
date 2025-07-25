-- Update the current user's role to employer
UPDATE public.profiles 
SET role = 'employer' 
WHERE user_id = auth.uid() AND role = 'worker';