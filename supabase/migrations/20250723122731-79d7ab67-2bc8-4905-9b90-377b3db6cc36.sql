-- Update existing wallets to have higher balances (>500,000)
UPDATE public.wallets 
SET balance = CASE 
  WHEN balance < 500000 THEN 750000.00 + FLOOR(RANDOM() * 250000)
  ELSE balance 
END,
updated_at = now()
WHERE balance < 500000;

-- Insert high-balance wallets for users who don't have wallets yet
INSERT INTO public.wallets (user_id, balance, total_earned, total_spent) 
SELECT p.id, 
       750000.00 + FLOOR(RANDOM() * 250000) as balance,
       CASE 
         WHEN p.role = 'worker' THEN FLOOR(RANDOM() * 50000) + 25000.00 
         ELSE 0.00 
       END as total_earned,
       CASE 
         WHEN p.role = 'employer' THEN FLOOR(RANDOM() * 100000) + 50000.00 
         ELSE 0.00 
       END as total_spent
FROM public.profiles p 
WHERE NOT EXISTS (
  SELECT 1 FROM public.wallets w WHERE w.user_id = p.id
);

-- Update the wallet update trigger to handle balance deductions
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If payment is completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Update payer's wallet (deduct balance and increase total_spent)
    UPDATE public.wallets 
    SET 
      balance = balance - NEW.amount,
      total_spent = total_spent + NEW.amount,
      updated_at = now()
    WHERE user_id = NEW.payer_id;
    
    -- Update payee's wallet (increase balance and total_earned)
    INSERT INTO public.wallets (user_id, balance, total_earned, updated_at)
    VALUES (NEW.payee_id, NEW.amount, NEW.amount, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = wallets.balance + NEW.amount,
      total_earned = wallets.total_earned + NEW.amount,
      updated_at = now();
      
    -- Set completed timestamp
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;