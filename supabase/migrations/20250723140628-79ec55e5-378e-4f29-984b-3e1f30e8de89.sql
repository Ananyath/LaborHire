-- Super Admin Features Database Migration

-- Add user status management enum
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'banned', 'pending_approval');

-- Add user approval workflow
ALTER TABLE public.profiles 
ADD COLUMN user_status public.user_status DEFAULT 'active',
ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN rejection_reason text,
ADD COLUMN approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN approved_at timestamp with time zone;

-- Add soft delete for users (instead of hard delete)
ALTER TABLE public.profiles 
ADD COLUMN deleted_at timestamp with time zone,
ADD COLUMN deleted_by uuid REFERENCES public.profiles(id);

-- Add verification request tracking
CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('identity', 'skills', 'employer')),
  document_urls text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewer_comments text,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add password reset audit table
CREATE TABLE public.password_reset_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reset_by_admin_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reset_reason text,
  reset_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Add analytics materialized view
CREATE MATERIALIZED VIEW public.platform_analytics AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles WHERE deleted_at IS NULL) as total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'worker' AND deleted_at IS NULL) as total_workers,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'employer' AND deleted_at IS NULL) as total_employers,
  (SELECT COUNT(*) FROM public.profiles WHERE user_status = 'active' AND deleted_at IS NULL) as active_users,
  (SELECT COUNT(*) FROM public.profiles WHERE user_status = 'suspended' AND deleted_at IS NULL) as suspended_users,
  (SELECT COUNT(*) FROM public.profiles WHERE user_status = 'banned' AND deleted_at IS NULL) as banned_users,
  (SELECT COUNT(*) FROM public.profiles WHERE approval_status = 'pending' AND deleted_at IS NULL) as pending_approvals,
  (SELECT COUNT(*) FROM public.jobs) as total_jobs,
  (SELECT COUNT(*) FROM public.jobs WHERE status = 'open') as open_jobs,
  (SELECT COUNT(*) FROM public.applications) as total_applications,
  (SELECT COUNT(*) FROM public.payments) as total_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM public.payments WHERE payment_status = 'completed') as total_revenue,
  (SELECT COUNT(*) FROM public.verification_requests WHERE status = 'pending') as pending_verifications,
  now() as last_updated;

-- Create indexes for performance
CREATE INDEX idx_profiles_user_status ON public.profiles(user_status);
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX idx_profiles_deleted_at ON public.profiles(deleted_at);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX idx_password_reset_audit_target_user ON public.password_reset_audit(target_user_id);

-- Enable RLS on new tables
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification_requests
CREATE POLICY "Users can view their own verification requests" 
ON public.verification_requests 
FOR SELECT 
USING (user_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Users can create their own verification requests" 
ON public.verification_requests 
FOR INSERT 
WITH CHECK (user_id IN (
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can view all verification requests" 
ON public.verification_requests 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can update verification requests" 
ON public.verification_requests 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles WHERE user_id = auth.uid()
));

-- RLS policies for password_reset_audit
CREATE POLICY "Only super admins can view password reset audit" 
ON public.password_reset_audit 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE user_id = auth.uid() AND admin_role = 'super_admin'
));

CREATE POLICY "Only super admins can create password reset audit" 
ON public.password_reset_audit 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE user_id = auth.uid() AND admin_role = 'super_admin'
));

-- Function to soft delete users
CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to approve/reject users
CREATE OR REPLACE FUNCTION public.update_user_approval(
  target_user_id uuid,
  new_status text,
  reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to reset user password (admin only)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  target_user_id uuid,
  reset_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to refresh analytics materialized view
CREATE OR REPLACE FUNCTION public.refresh_platform_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.platform_analytics;
END;
$$;

-- Trigger to auto-refresh analytics on data changes
CREATE OR REPLACE FUNCTION public.trigger_analytics_refresh()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use pg_notify to trigger a background refresh
  PERFORM pg_notify('analytics_refresh', '');
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for analytics refresh
CREATE TRIGGER refresh_analytics_on_profile_change
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_analytics_refresh();

CREATE TRIGGER refresh_analytics_on_job_change
  AFTER INSERT OR UPDATE OR DELETE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.trigger_analytics_refresh();

CREATE TRIGGER refresh_analytics_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_analytics_refresh();

-- Update triggers for timestamps
CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON public.verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Initial data refresh
SELECT public.refresh_platform_analytics();