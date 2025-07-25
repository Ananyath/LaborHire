-- Add RLS policies to allow cross-profile access without infinite recursion

-- Policy 1: Allow employers to view worker profiles (for Find Workers section)
CREATE POLICY "Employers can view worker profiles" 
ON public.profiles 
FOR SELECT 
USING (
  role = 'worker' 
  AND auth.uid() IN (
    SELECT user_id FROM public.profiles p2 
    WHERE p2.user_id = auth.uid() AND p2.role = 'employer'
  )
);

-- Policy 2: Allow employers to view applicant profiles (for Applications section)
CREATE POLICY "Employers can view applicant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT a.worker_id 
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    JOIN public.profiles emp ON emp.id = j.employer_id
    WHERE emp.user_id = auth.uid()
  )
);

-- Policy 3: Allow users to view conversation participant profiles (for messaging)
CREATE POLICY "Users can view conversation participant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT c.participant_1 
    FROM public.conversations c
    JOIN public.profiles p ON p.id = c.participant_2
    WHERE p.user_id = auth.uid()
    
    UNION
    
    SELECT c.participant_2 
    FROM public.conversations c
    JOIN public.profiles p ON p.id = c.participant_1
    WHERE p.user_id = auth.uid()
  )
);