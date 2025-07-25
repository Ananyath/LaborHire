
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StartChatButton } from '@/components/messaging/StartChatButton';
import { 
  Briefcase, 
  MapPin, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  Eye,
  MessageCircle
} from 'lucide-react';

interface WorkerApplication {
  id: string;
  job_id: string;
  status: string;
  applied_at: string;
  updated_at: string;
  jobs: {
    id: string;
    title: string;
    description: string;
    location: string;
    pay_rate: string;
    deadline: string | null;
    employer_id: string;
    employer: {
      id: string;
      full_name: string;
      company_name?: string;
    };
  };
}

export const WorkerApplications = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [loading, setLoading] = useState(true);

  // Check if user is a worker
  if (profile?.role !== 'worker') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            This feature is only available for workers.
          </p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(
            id,
            title,
            description,
            location,
            pay_rate,
            deadline,
            employer_id,
            employer:profiles!employer_id(
              id,
              full_name,
              company_name
            )
          )
        `)
        .eq('worker_id', profile.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load your applications.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const getStatusMessage = (status: string, jobTitle: string) => {
    switch (status) {
      case 'pending':
        return `Your application for "${jobTitle}" is under review.`;
      case 'accepted':
        return `Congratulations! Your application for "${jobTitle}" has been accepted.`;
      case 'rejected':
        return `Your application for "${jobTitle}" was not selected this time.`;
      default:
        return `Application status for "${jobTitle}" is unknown.`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Loading your applications...</h3>
          <p className="text-muted-foreground">Fetching application status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">My Job Applications</h2>
        <p className="text-muted-foreground">
          Track the status of your job applications
        </p>
      </div>

      {/* Application Notifications */}
      {applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              <span>Application Status Updates</span>
            </CardTitle>
            <CardDescription>
              Recent updates on your job applications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {applications.slice(0, 3).map((application) => (
              <div
                key={application.id}
                className={`p-3 rounded-lg border ${getStatusColor(application.status)}`}
              >
                <div className="flex items-start space-x-3">
                  {getStatusIcon(application.status)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getStatusMessage(application.status, application.jobs.title)}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      Updated {formatDate(application.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No applications yet</h3>
            <p className="text-muted-foreground">
              Start applying to jobs to see your applications here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{application.jobs.title}</CardTitle>
                    <CardDescription>
                      Applied on {formatDate(application.applied_at)}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(application.status)} capitalize`}
                  >
                    <span className="flex items-center space-x-1">
                      {getStatusIcon(application.status)}
                      <span>{application.status}</span>
                    </span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{application.jobs.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span>Rs. {application.jobs.pay_rate}</span>
                  </div>
                  {application.jobs.deadline && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>Deadline: {new Date(application.jobs.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {application.jobs.description}
                </p>

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex items-center space-x-3">
                    <div className="text-xs text-muted-foreground">
                      Last updated: {formatDate(application.updated_at)}
                    </div>
                    
                    {application.jobs.employer && application.status === 'accepted' && (
                      <StartChatButton
                        targetUserId={application.jobs.employer.id}
                        jobId={application.job_id}
                        variant="outline"
                        size="sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Contact Employer
                      </StartChatButton>
                    )}
                  </div>
                  
                  {application.status === 'accepted' && (
                    <Badge variant="default" className="bg-green-600">
                      🎉 Hired!
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
