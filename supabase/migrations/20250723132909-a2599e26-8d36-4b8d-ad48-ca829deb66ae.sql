-- Fix existing completed payments by updating their completed_at timestamp and updating wallets
UPDATE public.payments 
SET completed_at = updated_at 
WHERE payment_status = 'completed' AND completed_at IS NULL;

-- Manually update wallet balances for existing completed top-ups
DO $$ 
DECLARE
  payment_record RECORD;
BEGIN
  FOR payment_record IN 
    SELECT * FROM public.payments 
    WHERE payment_status = 'completed' 
    AND payer_id = payee_id 
    AND completed_at IS NOT NULL
  LOOP
    -- Update wallet for top-ups
    INSERT INTO public.wallets (user_id, balance, total_earned, updated_at)
    VALUES (payment_record.payee_id, payment_record.amount, payment_record.amount, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = wallets.balance + payment_record.amount,
      total_earned = wallets.total_earned + payment_record.amount,
      updated_at = now();
  END LOOP;
END $$;