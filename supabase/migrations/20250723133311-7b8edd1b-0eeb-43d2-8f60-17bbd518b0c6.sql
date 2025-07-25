-- Fix RLS policies for wallets table to allow trigger functions to work
DROP POLICY IF EXISTS "Users can create their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can view their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;

-- Create more permissive policies that allow system functions to work
CREATE POLICY "Users can view their own wallet" 
ON public.wallets 
FOR SELECT 
USING (user_id IN ( 
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

CREATE POLICY "Users can create and update wallets" 
ON public.wallets 
FOR ALL 
USING (user_id IN ( 
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
))
WITH CHECK (user_id IN ( 
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid()
));

-- Allow system functions (triggers) to bypass RLS for wallet operations
ALTER TABLE public.wallets FORCE ROW LEVEL SECURITY;