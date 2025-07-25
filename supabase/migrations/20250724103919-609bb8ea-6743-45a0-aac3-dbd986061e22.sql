-- Add back essential RLS policies for profiles without circular dependencies
-- These policies restore Find Workers, Applications, and Messaging functionality

-- Allow employers to view worker profiles (for Find Workers feature)
CREATE POLICY "Employers can view worker profiles" 
ON public.profiles FOR SELECT 
USING (
  -- Current user must be an employer
  EXISTS (
    SELECT 1 FROM public.profiles employer_profile 
    WHERE employer_profile.user_id = auth.uid() 
    AND employer_profile.role = 'employer'
  )
  AND 
  -- Target profile must be a worker
  profiles.role = 'worker'
);

-- Allow users to view profiles of people they have conversations with (for Messaging)
CREATE POLICY "Users can view conversation participants" 
ON public.profiles FOR SELECT 
USING (
  -- Target profile must be a participant in a conversation with current user
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE (
      (c.participant_1 = profiles.id AND c.participant_2 IN (
        SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
      ))
      OR
      (c.participant_2 = profiles.id AND c.participant_1 IN (
        SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
      ))
    )
  )
);

-- Allow employers to view worker profiles through applications (for Applications feature)
CREATE POLICY "Employers can view applicant profiles" 
ON public.profiles FOR SELECT 
USING (
  -- Target profile must be a worker who applied to current user's jobs
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.worker_id = profiles.id
    AND j.employer_id IN (
      SELECT p.id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  )
);