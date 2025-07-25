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
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { JobBrowser } from '@/components/jobs/JobBrowser';
import { WorkerApplications } from '@/components/workers/WorkerApplications';
import { MessagingSystem } from '@/components/messaging/MessagingSystem';
import { WalletOverview } from '@/components/payments/WalletOverview';
import { TransactionHistory } from '@/components/payments/TransactionHistory';
import { VerificationRequest } from '@/components/verification/VerificationRequest';
import { 
  User, 
  Phone, 
  MapPin, 
  Globe, 
  FileText, 
  Settings, 
  LogOut,
  UserCheck,
  UserX,
  Edit,
  Download,
  Award,
  Shield,
  Plus,
  Trash2,
  Briefcase,
  MessageCircle,
  Wallet
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useMessageNotifications } from '@/hooks/useMessageNotifications';

const WorkerDashboard = () => {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { isAdmin } = useAdminAccess();
  const { toast } = useToast();
  const { getSignedUrl, deleteFile } = useFileUpload();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { unreadCount } = useMessageNotifications();
  const [updatingStatus, setUpdatingStatus] = useState(false);

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

  const toggleAvailability = async () => {
    if (!profile) return;
    
    setUpdatingStatus(true);
    const newStatus = profile.availability_status === 'online' ? 'offline' : 'online';
    
    const { error } = await updateProfile({
      availability_status: newStatus
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update availability status.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Status updated',
        description: `You are now ${newStatus}.`,
      });
    }
    
    setUpdatingStatus(false);
  };

  const handleViewDocument = async (path: string, bucket: string, filename: string) => {
    const { url, error } = await getSignedUrl(bucket, path);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load document.',
        variant: 'destructive',
      });
      return;
    }
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDeleteCertification = async (urlToDelete: string) => {
    if (!profile?.certification_urls) return;
    
    const updatedCerts = profile.certification_urls.filter(url => url !== urlToDelete);
    const { error } = await updateProfile({
      certification_urls: updatedCerts
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete certification.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Certification deleted successfully.',
      });
    }
  };

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
          <h1 className="text-2xl font-bold text-primary">{t('worker.dashboard.title')}</h1>
          <div className="flex items-center space-x-4">
            <Badge 
              variant={profile.availability_status === 'online' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {profile.availability_status}
            </Badge>
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
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-4">
                  <AvatarImage src={profile.profile_photo_url || ''} />
                  <AvatarFallback className="text-lg">
                    {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                <CardDescription>{t('worker.profile.title')}</CardDescription>
                <Badge 
                  variant={profile.availability_status === 'online' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {profile.availability_status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{user?.email}</span>
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
                    <span className="truncate">{profile.address}</span>
                  </div>
                )}

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/worker-profile')}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t('worker.profile.edit')}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="jobs" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="jobs">
                  <Briefcase className="mr-2 h-4 w-4" />
                  {t('worker.jobs.browse')}
                </TabsTrigger>
                <TabsTrigger value="applications">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('worker.jobs.applied')}
                </TabsTrigger>
                <TabsTrigger value="messages" className="relative">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {t('worker.messages.title')}
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="wallet">
                  <Wallet className="mr-2 h-4 w-4" />
                  {t('worker.wallet.title')}
                </TabsTrigger>
                <TabsTrigger value="profile">
                  <User className="mr-2 h-4 w-4" />
                  {t('worker.profile.title')}
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Settings className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="jobs" className="mt-6">
                {/* Verification Status */}
                {!profile?.is_verified && (
                  <Card className="mb-6 border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-800">
                        <Shield className="h-5 w-5" />
                        Account Verification Required
                      </CardTitle>
                      <CardDescription className="text-red-700">
                        You must be verified before you can apply for jobs. Submit your verification documents to get started.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <VerificationRequest onSuccess={() => window.location.reload()} />
                    </CardContent>
                  </Card>
                )}
                <JobBrowser />
              </TabsContent>

              <TabsContent value="applications" className="mt-6">
                <WorkerApplications />
              </TabsContent>

              <TabsContent value="messages" className="mt-6">
                <MessagingSystem />
              </TabsContent>

              <TabsContent value="wallet" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1">
                    <WalletOverview />
                  </div>
                  <div className="lg:col-span-2">
                    <TransactionHistory />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <div className="space-y-6">
            {/* Availability Status */}
            <Card>
              <CardHeader>
                <CardTitle>Availability Status</CardTitle>
                <CardDescription>
                  Control your availability to receive job opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {profile.availability_status === 'online' ? (
                      <UserCheck className="h-5 w-5 text-green-600" />
                    ) : (
                      <UserX className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium">
                      You are currently {profile.availability_status}
                    </span>
                  </div>
                  
                  <Button 
                    onClick={toggleAvailability}
                    disabled={updatingStatus}
                    variant={profile.availability_status === 'online' ? 'destructive' : 'default'}
                  >
                    {updatingStatus ? (
                      'Updating...'
                    ) : profile.availability_status === 'online' ? (
                      'Go Offline'
                    ) : (
                      'Go Online'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>
                  Your professional skills and expertise
                </CardDescription>
              </CardHeader>
              <CardContent>
                {profile.skills && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No skills added yet. Update your profile to add skills.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Documents & Certifications */}
            <Card>
              <CardHeader>
                <CardTitle>Documents & Certifications</CardTitle>
                <CardDescription>
                  View and manage all your uploaded documents and certifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resume */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Resume/CV</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.resume_url ? 'PDF Document uploaded' : 'No resume uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {profile.resume_url ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(profile.resume_url!, 'resumes', 'resume.pdf')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Badge variant="secondary">✓ Uploaded</Badge>
                      </>
                    ) : (
                      <Badge variant="outline">Not uploaded</Badge>
                    )}
                  </div>
                </div>

                {/* Identity Document */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Identity Document</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.identity_document_url ? 'Government ID for verification' : 'No identity document uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {profile.identity_document_url ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(profile.identity_document_url!, 'identity-documents', 'identity.pdf')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Badge variant="secondary">✓ Uploaded</Badge>
                      </>
                    ) : (
                      <Badge variant="outline">Not uploaded</Badge>
                    )}
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Profile Photo</p>
                      <p className="text-sm text-muted-foreground">
                        {profile.profile_photo_url ? 'Profile picture uploaded' : 'No profile photo uploaded'}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {profile.profile_photo_url ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(profile.profile_photo_url!, 'profile-photos', 'profile.jpg')}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Badge variant="secondary">✓ Uploaded</Badge>
                      </>
                    ) : (
                      <Badge variant="outline">Not uploaded</Badge>
                    )}
                  </div>
                </div>

                {/* Certifications */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Award className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">Professional Certifications</span>
                    </div>
                    <Badge variant="secondary">
                      {profile.certification_urls ? profile.certification_urls.length : 0} file{profile.certification_urls?.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  {profile.certification_urls && profile.certification_urls.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {profile.certification_urls.map((cert, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <div className="flex items-center space-x-2">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Certificate {index + 1}</span>
                          </div>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(cert, 'certifications', `certificate-${index + 1}`)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCertification(cert)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-muted/30 rounded text-center">
                      <p className="text-sm text-muted-foreground">
                        No certifications uploaded yet.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add certifications from your profile edit page to showcase your qualifications.
                      </p>
                    </div>
                  )}
                </div>

                {/* Document Summary */}
                <div className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Document Status</p>
                      <p className="text-xs text-muted-foreground">
                        {[profile.resume_url, profile.identity_document_url, profile.profile_photo_url, ...(profile.certification_urls || [])].filter(Boolean).length} of {3 + (profile.certification_urls?.length || 0)} documents uploaded
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/worker-profile')}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Documents
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <RecentActivity />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

// Recent Activity Component
const RecentActivity = () => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setActivities(data || []);
    } catch (error: any) {
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
      case 'job_application':
        return <Briefcase className="h-4 w-4 text-blue-500" />;
      case 'profile_update':
        return <Edit className="h-4 w-4 text-green-500" />;
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
          Your recent job applications and profile updates
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
                  {getActivityIcon(activity.activity_type)}
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

export default WorkerDashboard;