-- Fix infinite recursion in admin_profiles RLS policies
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Super admins can view all admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can create admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can update admin profiles" ON public.admin_profiles;

-- Create new policies using security definer functions to avoid recursion
CREATE POLICY "Super admins can view all admin profiles" 
ON public.admin_profiles 
FOR SELECT 
USING (public.get_admin_role() = 'super_admin');

CREATE POLICY "Super admins can create admin profiles" 
ON public.admin_profiles 
FOR INSERT 
WITH CHECK (public.get_admin_role() = 'super_admin');

CREATE POLICY "Super admins can update admin profiles" 
ON public.admin_profiles 
FOR UPDATE 
USING (public.get_admin_role() = 'super_admin');