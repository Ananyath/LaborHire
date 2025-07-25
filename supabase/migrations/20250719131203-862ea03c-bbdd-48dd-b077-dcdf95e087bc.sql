-- Create profiles for existing users who don't have profiles
INSERT INTO public.profiles (user_id, full_name, role, phone)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  COALESCE(au.raw_user_meta_data->>'role', 'worker')::user_role as role,
  au.raw_user_meta_data->>'phone' as phone
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.user_id
WHERE p.user_id IS NULL;