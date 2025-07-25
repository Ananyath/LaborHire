import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface AdminProfile {
  id: string;
  user_id: string;
  admin_role: 'super_admin' | 'admin' | 'moderator';
  permissions: any;
  created_at: string;
  updated_at: string;
}

export const useAdminAccess = () => {
  const { profile, loading: authLoading } = useAuth();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHardcodedAdmin, setIsHardcodedAdmin] = useState(false);

  const checkHardcodedAdmin = () => {
    // Check if current user matches hardcoded admin credentials
    return profile?.full_name === 'admin' || 
           localStorage.getItem('hardcoded_admin_session') === 'admin-user';
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      // Check for hardcoded admin first, regardless of auth state
      const hardcodedCheck = checkHardcodedAdmin();
      if (hardcodedCheck) {
        setIsHardcodedAdmin(true);
        setIsAdmin(true);
        setAdminProfile({
          id: 'hardcoded-admin',
          user_id: profile?.user_id || 'hardcoded-admin-user',
          admin_role: 'super_admin',
          permissions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      if (!profile?.user_id || authLoading) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('user_id', profile.user_id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking admin access:', error);
          setIsAdmin(false);
          setAdminProfile(null);
        } else if (data) {
          setIsAdmin(true);
          setAdminProfile(data);
        } else {
          setIsAdmin(false);
          setAdminProfile(null);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
        setAdminProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [profile, authLoading]);

  const hasRole = (requiredRole: 'super_admin' | 'admin' | 'moderator') => {
    if (!adminProfile) return false;

    const roleHierarchy = {
      'moderator': 1,
      'admin': 2,
      'super_admin': 3
    };

    const userLevel = roleHierarchy[adminProfile.admin_role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  };

  return {
    adminProfile,
    isAdmin,
    loading: loading || authLoading,
    hasRole
  };
};