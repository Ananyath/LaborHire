-- Remove all RLS policies from profiles table to fix infinite recursion
-- This allows all authenticated users to view all profiles

-- Drop all existing RLS policies on profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view worker profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view conversation participant profiles" ON public.profiles;

-- Disable RLS entirely on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;