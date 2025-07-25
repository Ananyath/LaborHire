import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { JobForm } from '@/components/jobs/JobForm';
import { JobCard } from '@/components/jobs/JobCard';
import { ApplicationsViewer } from '@/components/jobs/ApplicationsViewer';
import { MessagingSystem } from '@/components/messaging/MessagingSystem';
import { FindWorkers } from '@/components/workers/FindWorkers';
import { WalletOverview } from '@/components/payments/WalletOverview';
import { TransactionHistory } from '@/components/payments/TransactionHistory';
import { VerificationRequest } from '@/components/verification/VerificationRequest';
import { 
  User, 
  Phone, 
  MapPin, 
  Globe, 
  LogOut,
  Plus,
  Users,
  Briefcase,
  Edit,
  Loader2,
  Shield,
  Settings,
  MessageCircle,
  Calendar,
  Wallet
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

const EmployerDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { unreadCount } = useMessageNotifications();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    applications: 0,
    hiredWorkers: 0
  });

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchJobs = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
      
      // Fetch stats after getting jobs
      await fetchStats(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load jobs.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (jobsData: any[]) => {
    if (!profile) return;

    try {
      // Count applications for all employer's jobs
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('status, job_id')
        .in('job_id', jobsData.map(job => job.id));

      if (appsError) throw appsError;

      const activeJobs = jobsData.filter(job => job.status === 'open').length;
      const totalApplications = applicationsData?.length || 0;
      const hiredWorkers = applicationsData?.filter(app => app.status === 'accepted').length || 0;

      setStats({
        totalJobs: jobsData.length,
        activeJobs,
        applications: totalApplications,
        hiredWorkers
      });
    } catch (error: any) {
      console.error('Failed to fetch stats:', error);
      // Set basic stats even if applications fetch fails
      const activeJobs = jobsData.filter(job => job.status === 'open').length;
      setStats({
        totalJobs: jobsData.length,
        activeJobs,
        applications: 0,
        hiredWorkers: 0
      });
    }
  };

  useEffect(() => {
    if (profile) {
      fetchJobs();
    }
  }, [profile]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Loading your profile...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">{t('employer.dashboard.title')}</h1>
          <div className="flex items-center space-x-2">
            <LanguageToggle />
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-24 h-24 mx-auto mb-4">
                  <AvatarImage src={profile.profile_photo_url || ''} />
                  <AvatarFallback className="text-lg">
                    {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{profile.full_name}</CardTitle>
                <CardDescription>{t('employer.profile.title')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{user?.email}</span>
                </div>
                
                {profile.phone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                
                {profile.address && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.address}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{profile.language_preference}</span>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/employer-profile')}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')} {t('nav.profile')}
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Cards */}
            <div className="mt-6 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Briefcase className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{stats.activeJobs}</p>
                      <p className="text-sm text-muted-foreground">{t('employer.jobs.active')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{stats.applications}</p>
                      <p className="text-sm text-muted-foreground">{t('employer.jobs.applications')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <User className="h-8 w-8 text-primary" />
                    <div className="ml-4">
                      <p className="text-2xl font-bold">{stats.hiredWorkers}</p>
                      <p className="text-sm text-muted-foreground">{t('employer.hiring.hired')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="overview">
                  <Briefcase className="mr-2 h-4 w-4" />
                  {t('dashboard.overview')}
                </TabsTrigger>
                <TabsTrigger value="jobs">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('nav.jobs')}
                </TabsTrigger>
                <TabsTrigger value="applications">
                  <Users className="mr-2 h-4 w-4" />
                  {t('nav.applications')}
                </TabsTrigger>
                <TabsTrigger value="workers">
                  <User className="mr-2 h-4 w-4" />
                  {t('employer.workers.title')}
                </TabsTrigger>
                <TabsTrigger value="wallet">
                  <Wallet className="mr-2 h-4 w-4" />
                  {t('nav.wallet')}
                </TabsTrigger>
                <TabsTrigger value="messages" className="relative">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('nav.messages')}
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('nav.settings')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Verification Status */}
                {!profile?.is_verified && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-800">
                        <Shield className="h-5 w-5" />
                        Account Verification Required
                      </CardTitle>
                      <CardDescription className="text-red-700">
                        You must be verified before you can post jobs. Submit your verification documents to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <VerificationRequest onSuccess={fetchJobs} />
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Manage your hiring process and job postings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                      <JobForm onSuccess={fetchJobs}>
                        <Button className="h-20 flex-col" disabled={!profile?.is_verified}>
                          <Plus className="h-6 w-6 mb-2" />
                          {profile?.is_verified ? 'Post New Job' : 'Verification Required'}
                        </Button>
                      </JobForm>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Jobs */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Recent Job Postings</CardTitle>
                        <CardDescription>
                          Your most recently posted jobs
                        </CardDescription>
                      </div>
                      <JobForm onSuccess={fetchJobs}>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Post Job
                        </Button>
                      </JobForm>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : jobs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No job postings yet</p>
                        <p className="text-sm">Start by posting your first job to find workers</p>
                        <JobForm onSuccess={fetchJobs}>
                          <Button className="mt-4">
                            <Plus className="mr-2 h-4 w-4" />
                            Post Your First Job
                          </Button>
                        </JobForm>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobs.slice(0, 3).map((job) => (
                          <JobCard 
                            key={job.id} 
                            job={job} 
                            onUpdate={fetchJobs}
                            onDelete={async (jobId) => {
                              try {
                                const { error } = await supabase
                                  .from('jobs')
                                  .delete()
                                  .eq('id', jobId);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: 'Success',
                                  description: 'Job deleted successfully.',
                                });
                                
                                fetchJobs();
                              } catch (error: any) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to delete job.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            onStatusChange={async (jobId, newStatus) => {
                              try {
                                const { error } = await supabase
                                  .from('jobs')
                                  .update({ status: newStatus })
                                  .eq('id', jobId);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: 'Success',
                                  description: `Job ${newStatus === 'open' ? 'opened' : 'closed'} successfully.`,
                                });
                                
                                fetchJobs();
                              } catch (error: any) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update job status.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            showEdit={false}
                          />
                        ))}
                        {jobs.length > 3 && (
                          <div className="text-center pt-4">
                            <Button variant="outline" onClick={() => {
                              // Switch to jobs tab
                              const jobsTab = document.querySelector('[value="jobs"]') as HTMLElement;
                              if (jobsTab) {
                                jobsTab.click();
                              }
                            }}>
                              View All Jobs ({jobs.length})
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="jobs" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>My Jobs</CardTitle>
                        <CardDescription>
                          Manage all your job postings
                        </CardDescription>
                      </div>
                      <JobForm onSuccess={fetchJobs}>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Post New Job
                        </Button>
                      </JobForm>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                      </div>
                    ) : jobs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No job postings yet</p>
                        <p className="text-sm">Start by posting your first job to find workers</p>
                        <JobForm onSuccess={fetchJobs}>
                          <Button className="mt-4">
                            <Plus className="mr-2 h-4 w-4" />
                            Post Your First Job
                          </Button>
                        </JobForm>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {jobs.map((job) => (
                          <JobCard 
                            key={job.id} 
                            job={job} 
                            onUpdate={fetchJobs}
                            onDelete={async (jobId) => {
                              try {
                                const { error } = await supabase
                                  .from('jobs')
                                  .delete()
                                  .eq('id', jobId);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: 'Success',
                                  description: 'Job deleted successfully.',
                                });
                                
                                fetchJobs();
                              } catch (error: any) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to delete job.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            onStatusChange={async (jobId, newStatus) => {
                              try {
                                const { error } = await supabase
                                  .from('jobs')
                                  .update({ status: newStatus })
                                  .eq('id', jobId);
                                
                                if (error) throw error;
                                
                                toast({
                                  title: 'Success',
                                  description: `Job ${newStatus === 'open' ? 'opened' : 'closed'} successfully.`,
                                });
                                
                                fetchJobs();
                              } catch (error: any) {
                                toast({
                                  title: 'Error',
                                  description: 'Failed to update job status.',
                                  variant: 'destructive',
                                });
                              }
                            }}
                            showEdit={false}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="applications" className="space-y-6">
                <ApplicationsViewer />
              </TabsContent>

              <TabsContent value="workers" className="space-y-6">
                <FindWorkers />
              </TabsContent>

              <TabsContent value="wallet" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <WalletOverview />
                  </div>
                  <div className="lg:col-span-2">
                    <TransactionHistory />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="messages" className="space-y-6">
                <MessagingSystem />
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <EmployerActivity />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

// Employer Activity Component
const EmployerActivity = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchActivities();
    }
  }, [profile]);

  const fetchActivities = async () => {
    if (!profile?.id) return;

    try {
      // Fetch recent job postings
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (jobError) throw jobError;

      // Fetch recent applications to employer's jobs
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(
            title,
            employer_id
          ),
          worker:profiles!worker_id(
            full_name
          )
        `)
        .eq('jobs.employer_id', profile.id)
        .order('applied_at', { ascending: false })
        .limit(5);

      if (appError) throw appError;

      // Fetch profile updates
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('updated_at')
        .eq('id', profile.id)
        .single();

      if (profileError) throw profileError;

      // Combine activities
      const jobActivities = (jobData || []).map((job: any) => ({
        id: `job-${job.id}`,
        type: 'job_posted',
        description: `Posted new job: ${job.title}`,
        created_at: job.created_at,
        metadata: { job_id: job.id, job_title: job.title }
      }));

      const applicationActivities = (appData || []).map((app: any) => ({
        id: `app-${app.id}`,
        type: 'application_received',
        description: `New application from ${app.worker?.full_name || 'Worker'} for ${app.jobs?.title || 'job'}`,
        created_at: app.applied_at,
        metadata: { 
          application_id: app.id, 
          worker_name: app.worker?.full_name,
          job_title: app.jobs?.title 
        }
      }));

      const profileActivity = profileData ? [{
        id: 'profile-update',
        type: 'profile_updated',
        description: 'Profile information updated',
        created_at: profileData.updated_at,
        metadata: { profile_id: profile.id }
      }] : [];

      // Combine and sort all activities
      const allActivities = [...jobActivities, ...applicationActivities, ...profileActivity]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setActivities(allActivities);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activities.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'job_posted':
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'application_received':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'profile_updated':
        return <Edit className="h-4 w-4 text-orange-500" />;
      default:
        return <Settings className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading activities...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Track your recent job postings, applications received, and profile changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
            <p className="text-sm">Your activities will appear here as you use the platform</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <div className="mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployerDashboard;