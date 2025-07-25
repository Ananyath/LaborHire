-- Update RLS policies to enforce verification requirements

-- Update jobs table RLS policies to only allow verified employers to post jobs
DROP POLICY IF EXISTS "Employers can create jobs" ON public.jobs;
CREATE POLICY "Verified employers can create jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (
  employer_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'employer'::user_role
    AND profiles.is_verified = true
  )
);

DROP POLICY IF EXISTS "Employers can update their own jobs" ON public.jobs;
CREATE POLICY "Verified employers can update their own jobs" 
ON public.jobs 
FOR UPDATE 
USING (
  employer_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'employer'::user_role
    AND profiles.is_verified = true
  )
);

-- Update applications table RLS policies to only allow verified workers to apply
DROP POLICY IF EXISTS "Workers can create applications" ON public.applications;
CREATE POLICY "Verified workers can create applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (
  worker_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'worker'::user_role
    AND profiles.is_verified = true
  )
);

-- Keep existing view policies for employers (they can still view their own jobs and applications)
-- Keep existing policies for workers to view their applications

-- Add a helpful function to check verification status
CREATE OR REPLACE FUNCTION public.is_user_verified(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT is_verified 
    FROM public.profiles 
    WHERE user_id = user_uuid 
    LIMIT 1
  ) = true;
END;
$$;