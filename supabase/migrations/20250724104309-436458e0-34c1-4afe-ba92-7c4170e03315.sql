-- Drop the problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "Employers can view worker profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.profiles;
DROP POLICY IF EXISTS "Employers can view applicant profiles" ON public.profiles;

-- Keep only the basic policies that work without circular dependencies
-- (These should already exist, but we're ensuring they're the only ones)

-- The working policies are:
-- 1. "Users can create their own profile" 
-- 2. "Users can update their own profile"
-- 3. "Users can view their own profile"

-- These use auth.uid() directly and don't cause recursion