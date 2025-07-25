-- Fix security warnings from the previous migration

-- Fix search_path for functions that need it
CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_profile_id uuid;
BEGIN
  -- Check if caller is admin
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND admin_role IN ('super_admin', 'admin')
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  -- Soft delete the user
  UPDATE public.profiles 
  SET 
    deleted_at = now(),
    deleted_by = admin_profile_id,
    user_status = 'banned'
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_activity(
    'user_deletion',
    'Soft deleted user profile',
    'profile',
    target_user_id
  );
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_user_approval(
  target_user_id uuid,
  new_status text,
  reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_profile_id uuid;
BEGIN
  -- Check if caller is admin
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  -- Update approval status
  UPDATE public.profiles 
  SET 
    approval_status = new_status,
    approved_by = admin_profile_id,
    approved_at = CASE WHEN new_status = 'approved' THEN now() ELSE NULL END,
    rejection_reason = CASE WHEN new_status = 'rejected' THEN reason ELSE NULL END,
    user_status = CASE 
      WHEN new_status = 'approved' THEN 'active'
      WHEN new_status = 'rejected' THEN 'suspended'
      ELSE user_status
    END
  WHERE id = target_user_id;
  
  -- Log the action
  PERFORM public.log_admin_activity(
    'user_approval',
    format('User %s: %s', new_status, COALESCE(reason, 'No reason provided')),
    'profile',
    target_user_id
  );
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_user_id uuid,
  reset_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_profile_id uuid;
  target_profile_id uuid;
  target_email text;
BEGIN
  -- Check if caller is super admin
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() AND admin_role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges - super admin required';
  END IF;
  
  -- Get target user email
  SELECT p.id, au.email INTO target_profile_id, target_email
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  WHERE p.id = target_user_id;
  
  IF target_email IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  -- Log the password reset
  INSERT INTO public.password_reset_audit (
    target_user_id, reset_by_admin_id, reset_reason
  ) VALUES (
    target_profile_id, admin_profile_id, reset_reason
  );
  
  -- Log admin activity
  PERFORM public.log_admin_activity(
    'password_reset',
    format('Reset password for user. Reason: %s', COALESCE(reset_reason, 'Not specified')),
    'profile',
    target_profile_id
  );
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_platform_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.platform_analytics;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_analytics_refresh()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Use pg_notify to trigger a background refresh
  PERFORM pg_notify('analytics_refresh', '');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Remove materialized view from API access
REVOKE ALL ON public.platform_analytics FROM anon, authenticated;

-- Create a secure function to access analytics instead
CREATE OR REPLACE FUNCTION public.get_platform_analytics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT to_jsonb(pa.*) INTO result
  FROM public.platform_analytics pa;
  
  RETURN result;
END;
$$;