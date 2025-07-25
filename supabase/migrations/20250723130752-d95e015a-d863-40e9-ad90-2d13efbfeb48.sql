-- Reset all wallet balances to 0 to start fresh
UPDATE public.wallets 
SET 
  balance = 0.00,
  total_earned = 0.00,
  total_spent = 0.00,
  updated_at = now();

-- Ensure new wallets always start with 0 balance (this is already the default but making it explicit)
ALTER TABLE public.wallets 
ALTER COLUMN balance SET DEFAULT 0.00,
ALTER COLUMN total_earned SET DEFAULT 0.00,
ALTER COLUMN total_spent SET DEFAULT 0.00;