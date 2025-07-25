-- Only add the missing foreign key constraint between payments and jobs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'payments_job_id_fkey' 
        AND table_name = 'payments'
    ) THEN
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_job_id_fkey 
        FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;
    END IF;
END $$;