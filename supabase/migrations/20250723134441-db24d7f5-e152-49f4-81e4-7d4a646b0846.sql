-- Fix the update_wallet_balance function to use SECURITY DEFINER
-- This allows the trigger to bypass RLS and update wallets for both payer and payee
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- If payment is completed (either on insert or update)
  IF NEW.payment_status = 'completed' AND (TG_OP = 'INSERT' OR OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    
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

-- Recreate the trigger to ensure it's properly configured
DROP TRIGGER IF EXISTS update_wallet_on_payment_completion ON public.payments;
CREATE TRIGGER update_wallet_on_payment_completion
  BEFORE INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();