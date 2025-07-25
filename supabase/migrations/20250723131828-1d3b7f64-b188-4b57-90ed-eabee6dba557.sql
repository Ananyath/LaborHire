-- Add missing foreign key constraint between payments and jobs
ALTER TABLE public.payments 
ADD CONSTRAINT payments_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;

-- Also add foreign key constraints for payer_id and payee_id to profiles
ALTER TABLE public.payments 
ADD CONSTRAINT payments_payer_id_fkey 
FOREIGN KEY (payer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_payee_id_fkey 
FOREIGN KEY (payee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;