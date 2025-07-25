-- Create wallets table to track user balances
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment methods enum
CREATE TYPE public.payment_method AS ENUM ('esewa', 'khalti', 'bank', 'cash');

-- Create payment status enum  
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_id UUID NOT NULL,
  payee_id UUID NOT NULL,
  job_id UUID,
  amount DECIMAL(10,2) NOT NULL,
  payment_method public.payment_method NOT NULL,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  transaction_reference TEXT,
  payment_details JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for wallets
CREATE POLICY "Users can view their own wallet" 
ON public.wallets 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = user_id
  )
);

CREATE POLICY "Users can update their own wallet" 
ON public.wallets 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = user_id
  )
);

CREATE POLICY "Users can create their own wallet" 
ON public.wallets 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = user_id
  )
);

-- RLS policies for payments
CREATE POLICY "Users can view payments they are involved in" 
ON public.payments 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = payer_id
  ) OR 
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = payee_id
  )
);

CREATE POLICY "Users can create payments as payer" 
ON public.payments 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = payer_id
  )
);

CREATE POLICY "Users can update payments they are involved in" 
ON public.payments 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = payer_id
  ) OR 
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = payee_id
  )
);

-- Add indexes for better performance
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_payments_payer ON public.payments(payer_id);
CREATE INDEX idx_payments_payee ON public.payments(payee_id);
CREATE INDEX idx_payments_job ON public.payments(job_id);
CREATE INDEX idx_payments_status ON public.payments(payment_status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);

-- Create function to update wallet balances
CREATE OR REPLACE FUNCTION public.update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- If payment is completed
  IF NEW.payment_status = 'completed' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'completed') THEN
    -- Update payee's wallet (increase balance and total_earned)
    INSERT INTO public.wallets (user_id, balance, total_earned, updated_at)
    VALUES (NEW.payee_id, NEW.amount, NEW.amount, now())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = wallets.balance + NEW.amount,
      total_earned = wallets.total_earned + NEW.amount,
      updated_at = now();
    
    -- Update payer's wallet (increase total_spent)
    INSERT INTO public.wallets (user_id, total_spent, updated_at)
    VALUES (NEW.payer_id, NEW.amount, now())
    ON CONFLICT (user_id)
    DO UPDATE SET 
      total_spent = wallets.total_spent + NEW.amount,
      updated_at = now();
      
    -- Set completed timestamp
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update wallet balances when payment status changes
CREATE TRIGGER update_wallet_on_payment_completion
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wallet_balance();

-- Create function to get user wallet with auto-creation
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(profile_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  balance DECIMAL(10,2),
  total_earned DECIMAL(10,2),
  total_spent DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Try to get existing wallet
  RETURN QUERY 
  SELECT w.id, w.user_id, w.balance, w.total_earned, w.total_spent, w.created_at, w.updated_at
  FROM public.wallets w
  WHERE w.user_id = profile_user_id;
  
  -- If no wallet exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.wallets (user_id) VALUES (profile_user_id);
    RETURN QUERY 
    SELECT w.id, w.user_id, w.balance, w.total_earned, w.total_spent, w.created_at, w.updated_at
    FROM public.wallets w
    WHERE w.user_id = profile_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for payments and wallets
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.wallets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;