
-- Insert admin profile record for the existing admin user
INSERT INTO public.admin_profiles (user_id, admin_role, permissions, created_by)
SELECT 
  p.user_id,
  'super_admin'::admin_role,
  '{"all": true}'::jsonb,
  p.id
FROM public.profiles p
WHERE p.full_name = 'admin'
ON CONFLICT (user_id) DO UPDATE SET
  admin_role = 'super_admin'::admin_role,
  permissions = '{"all": true}'::jsonb,
  updated_at = now();
