import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Briefcase, 
  MessageSquare, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  UserCheck,
  UserX,
  Clock
} from 'lucide-react';

interface AnalyticsData {
  total_users: number;
  total_workers: number;
  total_employers: number;
  active_users: number;
  suspended_users: number;
  banned_users: number;
  pending_approvals: number;
  total_jobs: number;
  open_jobs: number;
  total_applications: number;
  total_payments: number;
  total_revenue: number;
  pending_verifications: number;
  last_updated: string;
  recentActivity: any[];
}

export const PlatformAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    total_users: 0,
    total_workers: 0,
    total_employers: 0,
    active_users: 0,
    suspended_users: 0,
    banned_users: 0,
    pending_approvals: 0,
    total_jobs: 0,
    open_jobs: 0,
    total_applications: 0,
    total_payments: 0,
    total_revenue: 0,
    pending_verifications: 0,
    last_updated: '',
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    
    // Set up real-time listener for analytics refresh
    const channel = supabase
      .channel('analytics_refresh')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles'
      }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'jobs'
      }, () => {
        fetchAnalytics();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        fetchAnalytics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Use the secure analytics function
      const { data: analyticsData, error: analyticsError } = await supabase
        .rpc('get_platform_analytics');

      if (analyticsError) throw analyticsError;

      // Fetch recent activity
      const { data: recentActivity } = await supabase
        .from('admin_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (analyticsData && typeof analyticsData === 'object') {
        const data = analyticsData as any;
        setAnalytics({
          total_users: Number(data.total_users) || 0,
          total_workers: Number(data.total_workers) || 0,
          total_employers: Number(data.total_employers) || 0,
          active_users: Number(data.active_users) || 0,
          suspended_users: Number(data.suspended_users) || 0,
          banned_users: Number(data.banned_users) || 0,
          pending_approvals: Number(data.pending_approvals) || 0,
          total_jobs: Number(data.total_jobs) || 0,
          open_jobs: Number(data.open_jobs) || 0,
          total_applications: Number(data.total_applications) || 0,
          total_payments: Number(data.total_payments) || 0,
          total_revenue: Number(data.total_revenue) || 0,
          pending_verifications: Number(data.pending_verifications) || 0,
          last_updated: String(data.last_updated) || '',
          recentActivity: recentActivity || []
        });
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh the materialized view
    await supabase.rpc('refresh_platform_analytics');
    await fetchAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  const stats = [
    {
      title: 'Total Users',
      value: analytics.total_users,
      icon: Users,
      description: `${analytics.total_workers} workers, ${analytics.total_employers} employers`,
      color: 'text-blue-600'
    },
    {
      title: 'Active Users',
      value: analytics.active_users,
      icon: UserCheck,
      description: `${analytics.suspended_users} suspended, ${analytics.banned_users} banned`,
      color: 'text-green-600'
    },
    {
      title: 'Jobs Posted',
      value: analytics.total_jobs,
      icon: Briefcase,
      description: `${analytics.open_jobs} currently open`,
      color: 'text-purple-600'
    },
    {
      title: 'Revenue',
      value: formatCurrency(analytics.total_revenue),
      icon: DollarSign,
      description: `From ${analytics.total_payments} payments`,
      color: 'text-emerald-600'
    }
  ];

  const pendingStats = [
    {
      title: 'Pending Approvals',
      value: analytics.pending_approvals,
      icon: Clock,
      description: 'Users awaiting approval',
      color: 'text-orange-600'
    },
    {
      title: 'Pending Verifications',
      value: analytics.pending_verifications,
      icon: UserX,
      description: 'Verification requests',
      color: 'text-red-600'
    },
    {
      title: 'Applications',
      value: analytics.total_applications,
      icon: MessageSquare,
      description: 'Total job applications',
      color: 'text-blue-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Platform Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Last updated: {analytics.last_updated ? new Date(analytics.last_updated).toLocaleString() : 'Never'}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Main Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Pending Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pendingStats.map((stat, index) => (
            <Card key={index} className="border-dashed">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Recent Admin Activity</span>
          </CardTitle>
          <CardDescription>
            Latest administrative actions performed on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.length > 0 ? (
              analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between border-b pb-3 last:border-b-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {activity.action_type.replace('_', ' ')}
                      </Badge>
                      {activity.target_type && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.target_type}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent admin activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
            <CardDescription>Key platform metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Job Success Rate</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">85%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Retention</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">72%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Payment Success Rate</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">94%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Support Tickets</span>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">12</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Metrics</CardTitle>
            <CardDescription>Month-over-month growth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New Users</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">+12%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Job Postings</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">+8%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Revenue</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">+15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Users</span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-bold">+6%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};