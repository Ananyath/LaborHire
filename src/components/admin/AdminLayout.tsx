import { useAdminAccess } from '@/hooks/useAdminAccess';
import { Loader } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'moderator';
}

export const AdminLayout = ({ children, requiredRole = 'moderator' }: AdminLayoutProps) => {
  const { isAdmin, adminProfile, loading, hasRole } = useAdminAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin || !hasRole(requiredRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this admin section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Role: <span className="font-medium capitalize">{adminProfile?.admin_role}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
};