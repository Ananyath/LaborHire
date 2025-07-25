-- Fix RLS policies for wallets - the current policies have incorrect logic
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;

-- Create correct RLS policies for wallets
CREATE POLICY "Users can view their own wallet" 
ON public.wallets 
FOR SELECT 
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own wallet" 
ON public.wallets 
FOR UPDATE 
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own wallet" 
ON public.wallets 
FOR INSERT 
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Fix RLS policies for payments - the current policies have incorrect logic  
DROP POLICY IF EXISTS "Users can view payments they are involved in" ON public.payments;
DROP POLICY IF EXISTS "Users can create payments as payer" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments they are involved in" ON public.payments;

-- Create correct RLS policies for payments
CREATE POLICY "Users can view payments they are involved in" 
ON public.payments 
FOR SELECT 
USING (
  payer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR 
  payee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create payments as payer" 
ON public.payments 
FOR INSERT 
WITH CHECK (payer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update payments they are involved in" 
ON public.payments 
FOR UPDATE 
USING (
  payer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR 
  payee_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

-- Fix the wallet update trigger to handle top-ups correctly
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- If payment is completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    
    -- Check if this is a top-up (payer and payee are the same)
    IF NEW.payer_id = NEW.payee_id THEN
      -- This is a top-up, just add to balance and total_earned
      INSERT INTO public.wallets (user_id, balance, total_earned, updated_at)
      VALUES (NEW.payee_id, NEW.amount, NEW.amount, now())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = wallets.balance + NEW.amount,
        total_earned = wallets.total_earned + NEW.amount,
        updated_at = now();
    ELSE
      -- This is a regular payment between different users
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
    END IF;
      
    -- Set completed timestamp
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;