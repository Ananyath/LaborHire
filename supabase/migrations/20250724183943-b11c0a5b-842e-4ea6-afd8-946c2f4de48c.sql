
-- Add unique constraint to prevent multiple payments for the same job-worker combination
-- This ensures one payment per job per worker
ALTER TABLE public.payments 
ADD CONSTRAINT unique_job_worker_payment 
UNIQUE (job_id, payer_id, payee_id) 
WHERE job_id IS NOT NULL;

-- Add index for better performance on payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_job_worker 
ON public.payments (job_id, payer_id, payee_id) 
WHERE job_id IS NOT NULL;
