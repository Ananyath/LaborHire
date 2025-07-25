-- Add current user to admin_profiles table as super_admin
INSERT INTO public.admin_profiles (user_id, admin_role, permissions, created_by)
SELECT 
  '9cf1a5ec-501a-46ec-af53-5d0d157c41a1'::uuid,
  'super_admin'::admin_role,
  '{"all": true}'::jsonb,
  '9cf1a5ec-501a-46ec-af53-5d0d157c41a1'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM public.admin_profiles 
  WHERE user_id = '9cf1a5ec-501a-46ec-af53-5d0d157c41a1'
);