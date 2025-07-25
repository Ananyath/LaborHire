-- Create applications table to track job applications
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

-- Create activity_logs table to track user activities
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for applications table
-- Workers can view their own applications
CREATE POLICY "Workers can view their own applications" 
ON public.applications 
FOR SELECT 
USING (worker_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'worker'::user_role
));

-- Workers can create their own applications
CREATE POLICY "Workers can create applications" 
ON public.applications 
FOR INSERT 
WITH CHECK (worker_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'worker'::user_role
));

-- Workers can update their own applications (withdraw, etc.)
CREATE POLICY "Workers can update their own applications" 
ON public.applications 
FOR UPDATE 
USING (worker_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'worker'::user_role
));

-- Employers can view applications for their jobs
CREATE POLICY "Employers can view applications for their jobs" 
ON public.applications 
FOR SELECT 
USING (job_id IN (
  SELECT jobs.id 
  FROM jobs 
  WHERE jobs.employer_id IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'employer'::user_role
  )
));

-- Employers can update applications for their jobs
CREATE POLICY "Employers can update applications for their jobs" 
ON public.applications 
FOR UPDATE 
USING (job_id IN (
  SELECT jobs.id 
  FROM jobs 
  WHERE jobs.employer_id IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.role = 'employer'::user_role
  )
));

-- Create policies for activity_logs table
-- Users can view their own activity logs
CREATE POLICY "Users can view their own activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can create their own activity logs
CREATE POLICY "Users can create their own activity logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Create trigger for applications updated_at
CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  activity_type TEXT,
  description TEXT,
  metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, activity_type, description, metadata)
  VALUES (auth.uid(), activity_type, description, metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;