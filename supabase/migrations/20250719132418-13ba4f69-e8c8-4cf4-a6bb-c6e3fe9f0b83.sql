-- Create jobs table for employer job postings
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  location TEXT NOT NULL,
  pay_rate TEXT NOT NULL,
  duration TEXT NOT NULL,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for job access
CREATE POLICY "Employers can view their own jobs" 
ON public.jobs 
FOR SELECT 
USING (employer_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'employer'
));

CREATE POLICY "Employers can create jobs" 
ON public.jobs 
FOR INSERT 
WITH CHECK (employer_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'employer'
));

CREATE POLICY "Employers can update their own jobs" 
ON public.jobs 
FOR UPDATE 
USING (employer_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'employer'
));

CREATE POLICY "Employers can delete their own jobs" 
ON public.jobs 
FOR DELETE 
USING (employer_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid() AND role = 'employer'
));

-- Workers can view all open jobs
CREATE POLICY "Workers can view open jobs" 
ON public.jobs 
FOR SELECT 
USING (status = 'open' AND auth.uid() IN (
  SELECT user_id FROM public.profiles WHERE role = 'worker'
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_jobs_employer_id ON public.jobs(employer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);