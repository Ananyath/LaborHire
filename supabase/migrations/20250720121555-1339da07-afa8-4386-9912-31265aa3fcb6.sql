-- Create admin roles and permissions system
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'moderator');

-- Create admin_profiles table for admin users
CREATE TABLE public.admin_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  admin_role public.admin_role NOT NULL DEFAULT 'moderator',
  permissions JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create platform_settings table for system configuration
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_activity_logs for audit trail
CREATE TABLE public.admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin_profiles (only super_admins can manage)
CREATE POLICY "Super admins can view all admin profiles" 
ON public.admin_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles ap2 
    WHERE ap2.user_id = auth.uid() 
    AND ap2.admin_role = 'super_admin'
  )
);

CREATE POLICY "Super admins can create admin profiles" 
ON public.admin_profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles ap2 
    WHERE ap2.user_id = auth.uid() 
    AND ap2.admin_role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update admin profiles" 
ON public.admin_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles ap2 
    WHERE ap2.user_id = auth.uid() 
    AND ap2.admin_role = 'super_admin'
  )
);

-- RLS policies for platform_settings (admins and above can view, super_admins can modify)
CREATE POLICY "Admins can view platform settings" 
ON public.platform_settings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can create platform settings" 
ON public.platform_settings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND admin_role = 'super_admin'
  ) AND updated_by = (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Super admins can update platform settings" 
ON public.platform_settings 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
    AND admin_role = 'super_admin'
  )
);

-- RLS policies for admin_activity_logs (admins can view their logs, super_admins can view all)
CREATE POLICY "Admins can view activity logs" 
ON public.admin_activity_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid()
    AND (
      admin_role = 'super_admin' 
      OR admin_id = (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Admins can create activity logs" 
ON public.admin_activity_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = auth.uid()
  ) AND admin_id = (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX idx_admin_profiles_user_id ON public.admin_profiles(user_id);
CREATE INDEX idx_admin_profiles_role ON public.admin_profiles(admin_role);
CREATE INDEX idx_platform_settings_key ON public.platform_settings(setting_key);
CREATE INDEX idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_profiles 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT admin_role::text FROM public.admin_profiles 
    WHERE user_id = user_uuid 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  action_type TEXT,
  description TEXT,
  target_type TEXT DEFAULT NULL,
  target_id UUID DEFAULT NULL,
  metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
  admin_profile_id UUID;
BEGIN
  -- Get admin profile id
  SELECT id INTO admin_profile_id 
  FROM public.profiles 
  WHERE user_id = auth.uid();
  
  -- Insert activity log
  INSERT INTO public.admin_activity_logs (
    admin_id, action_type, description, target_type, target_id, metadata
  )
  VALUES (
    admin_profile_id, action_type, description, target_type, target_id, metadata
  )
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for admin tables
ALTER TABLE public.admin_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;
ALTER TABLE public.admin_activity_logs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_activity_logs;