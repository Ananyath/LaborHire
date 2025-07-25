-- COMPLETE FIX: Remove ALL circular dependencies in profiles RLS policies

-- Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view profiles of conversation participants" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view worker profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;

-- Create ONLY the essential policies that don't cause circular dependencies
-- These policies use ONLY auth.uid() and don't reference the profiles table

CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- NOTE: Removing complex policies temporarily to fix infinite recursion
-- Employer-worker view and conversation participant view will need 
-- to be implemented using a different approach that doesn't query 
-- the profiles table from within profiles policies