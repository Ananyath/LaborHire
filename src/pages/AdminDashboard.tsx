import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { UserManagement } from '@/components/admin/UserManagement';
import { PlatformAnalytics } from '@/components/admin/PlatformAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Settings, 
  Shield,
  Activity,
  Database
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/ui/language-toggle';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const { t } = useLanguage();

  return (
    <AdminLayout requiredRole="moderator">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('admin.dashboard.title')}</h1>
            <p className="text-muted-foreground">
              {t('admin.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <LanguageToggle />
            <Badge variant="outline" className="flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>{t('footer.adminAccess')}</span>
            </Badge>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>{t('admin.analytics.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>{t('admin.users.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center space-x-2">
              <Database className="w-4 h-4" />
              <span>{t('admin.system.title')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-4">
            <PlatformAnalytics />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="w-5 h-5" />
                  <span>System Status</span>
                </CardTitle>
                <CardDescription>
                  Platform health and system monitoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium">Database</h3>
                    <p className="text-sm text-muted-foreground">Operational</p>
                    <Badge variant="outline" className="mt-2">Healthy</Badge>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium">Authentication</h3>
                    <p className="text-sm text-muted-foreground">All systems running</p>
                    <Badge variant="outline" className="mt-2">Healthy</Badge>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <h3 className="font-medium">Storage</h3>
                    <p className="text-sm text-muted-foreground">File uploads working</p>
                    <Badge variant="outline" className="mt-2">Healthy</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Platform Settings</span>
                </CardTitle>
                <CardDescription>
                  Configure platform-wide settings and policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Payment Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Commission Rate</label>
                        <p className="text-sm text-muted-foreground">5.0%</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Minimum Payment</label>
                        <p className="text-sm text-muted-foreground">$5.00</p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">User Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Auto-approve Workers</label>
                        <Badge variant="secondary">Disabled</Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Require Identity Verification</label>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Settings management interface coming soon. Contact super admin to modify platform settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}