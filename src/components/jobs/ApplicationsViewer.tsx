
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { StartChatButton } from '@/components/messaging/StartChatButton';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { PaymentForm } from '@/components/payments/PaymentForm';
import { 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Award, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock,
  Eye,
  Download,
  MessageCircle,
  Star,
  DollarSign,
  Briefcase,
  Calendar
} from 'lucide-react';

interface Application {
  id: string;
  job_id: string;
  worker_id: string;
  status: string;
  cover_letter: string | null;
  applied_at: string;
  updated_at: string;
  job: {
    title: string;
    description: string;
    location: string;
    pay_rate: string;
  };
  worker: {
    id: string;
    full_name: string;
    phone: string;
    address: string;
    bio: string;
    skills: string[];
    profile_photo_url: string;
    resume_url: string;
    certification_urls: string[];
    identity_document_url: string;
    is_verified: boolean;
    availability_status: string;
  };
}

interface WorkerJobHistory {
  id: string;
  job_title: string;
  employer_name: string;
  completed_at: string;
  rating: number;
  review_text: string;
}

interface ApplicationsViewerProps {
  className?: string;
}

export const ApplicationsViewer = ({ className }: ApplicationsViewerProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { getSignedUrl } = useFileUpload();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [workerJobHistory, setWorkerJobHistory] = useState<WorkerJobHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('list');

  // Check if user is an employer
  if (profile?.role !== 'employer') {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            This feature is only available for employers.
          </p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, statusFilter]);

  const fetchApplications = async () => {
    if (!profile?.id) return;

    try {
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          jobs!inner(
            id,
            title,
            description,
            location,
            pay_rate,
            employer_id
          )
        `)
        .eq('jobs.employer_id', profile.id)
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;

      // Fetch worker profiles for each application with explicit permission check
      // Since we're fetching profiles of workers who applied to employer's jobs, this is allowed
      const applicationsWithWorkers = await Promise.all(
        (applicationsData || []).map(async (app: any) => {
          const { data: workerData, error: workerError } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              phone,
              address,
              bio,
              skills,
              profile_photo_url,
              resume_url,
              certification_urls,
              identity_document_url,
              is_verified,
              availability_status
            `)
            .eq('id', app.worker_id)
            .single();

          if (workerError) {
            console.error('Worker error:', workerError);
            return null;
          }

          return {
            ...app,
            job: app.jobs,
            worker: workerData
          };
        })
      );

      const validApplications = applicationsWithWorkers.filter(app => app !== null);
      setApplications(validApplications);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkerJobHistory = async (workerId: string) => {
    setHistoryLoading(true);
    try {
      // Fetch accepted applications first (these represent completed jobs)
      const { data: acceptedApps, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          updated_at,
          job_id,
          jobs!inner(
            title,
            employer_id,
            pay_rate,
            location
          )
        `)
        .eq('worker_id', workerId)
        .eq('status', 'accepted')
        .order('updated_at', { ascending: false });

      if (appsError) throw appsError;

      // For each accepted application, try to fetch reviews
      const jobHistoryPromises = (acceptedApps || []).map(async (app: any) => {
        const { data: reviewData } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            review_text,
            created_at,
            reviewer:profiles!reviewer_id(
              full_name,
              company_name
            )
          `)
          .eq('reviewee_id', workerId)
          .eq('job_id', app.job_id)
          .single();

        return {
          id: app.id,
          job_title: app.jobs.title,
          employer_name: 'Employer',
          completed_at: app.updated_at,
          rating: reviewData?.rating || 0,
          review_text: reviewData?.review_text || 'No review available',
          pay_rate: app.jobs.pay_rate,
          location: app.jobs.location,
          has_review: !!reviewData
        };
      });

      const jobHistory = await Promise.all(jobHistoryPromises);
      setWorkerJobHistory(jobHistory);
    } catch (error: any) {
      console.error('Error fetching job history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load job history.',
        variant: 'destructive',
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    setFilteredApplications(filtered);
  };

  const handleStatusChange = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;

      toast({
        title: 'Application Updated',
        description: `Application ${newStatus} successfully.`,
      });

      fetchApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (application: Application) => {
    setSelectedApplication(application);
    fetchWorkerJobHistory(application.worker_id);
    setSelectedTab('detail');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'yellow';
      case 'accepted': return 'green';
      case 'rejected': return 'red';
      case 'withdrawn': return 'gray';
      default: return 'gray';
    }
  };

  const openDocument = async (url: string) => {
    if (!url) {
      toast({
        title: 'Error',
        description: 'Document not available',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If URL is a full URL (starts with http), open directly
      if (url.startsWith('http')) {
        window.open(url, '_blank');
        return;
      }

      // Otherwise, it's a storage path that needs a signed URL
      let bucket = '';
      
      // Determine bucket based on file path or context
      if (url.includes('resume') || url.toLowerCase().includes('cv')) {
        bucket = 'resumes';
      } else if (url.includes('identity') || url.includes('document')) {
        bucket = 'identity-documents';
      } else if (url.includes('certification') || url.includes('certificate')) {
        bucket = 'certifications';
      } else {
        // Default fallback - try resumes first, then identity-documents
        bucket = 'resumes';
      }

      try {
        const { url: signedUrl, error } = await getSignedUrl(bucket, url);
        if (error || !signedUrl) {
          // If first bucket fails, try identity-documents
          if (bucket === 'resumes') {
            const { url: signedUrl2, error: error2 } = await getSignedUrl('identity-documents', url);
            if (error2 || !signedUrl2) {
              // If that fails too, try certifications
              const { url: signedUrl3, error: error3 } = await getSignedUrl('certifications', url);
              if (error3 || !signedUrl3) {
                throw new Error('Failed to access document in any bucket');
              }
              window.open(signedUrl3, '_blank');
              return;
            }
            window.open(signedUrl2, '_blank');
            return;
          }
          throw new Error('Failed to access document');
        }
        window.open(signedUrl, '_blank');
      } catch (bucketError) {
        // Try opening as public URL
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast({
        title: 'Error',
        description: 'Failed to open document. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Loading applications...</h3>
          <p className="text-muted-foreground">Fetching candidate information</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Job Applications</h2>
            <p className="text-muted-foreground">
              Manage applications from workers for your posted jobs
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="detail">Detail View</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="list">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No applications found</h3>
                <p className="text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'No one has applied to your jobs yet.'
                    : `No ${statusFilter} applications found.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <Card key={application.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={application.worker.profile_photo_url || ''} />
                          <AvatarFallback>
                            {application.worker.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">{application.worker.full_name}</CardTitle>
                            {application.worker.is_verified && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <Shield className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                            <Badge 
                              variant={application.worker.availability_status === 'online' ? 'default' : 'secondary'}
                              className="capitalize"
                            >
                              {application.worker.availability_status}
                            </Badge>
                          </div>
                          <CardDescription>
                            Applied for: {application.job.title} • {formatDate(application.applied_at)}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={`text-${getStatusColor(application.status)}-600`}>
                          {application.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {application.status === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {application.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </Badge>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(application)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{application.worker.phone || 'No phone provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{application.worker.address || 'No address provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Award className="w-4 h-4 text-muted-foreground" />
                        <span>{application.worker.skills?.length || 0} skills</span>
                      </div>
                    </div>

                    {application.worker.skills && application.worker.skills.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Skills:</p>
                        <div className="flex flex-wrap gap-1">
                          {application.worker.skills.slice(0, 6).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {application.worker.skills.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{application.worker.skills.length - 6} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {application.status === 'pending' && (
                      <div className="flex space-x-2 pt-4 border-t">
                        <Button
                          onClick={() => handleStatusChange(application.id, 'accepted')}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleStatusChange(application.id, 'rejected')}
                          variant="outline"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <StartChatButton
                          targetUserId={application.worker_id}
                          jobId={application.job_id}
                          variant="outline"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </StartChatButton>
                      </div>
                    )}

                    {application.status === 'accepted' && (
                      <div className="flex space-x-2 pt-4 border-t">
                        <PaymentForm
                          payeeId={application.worker_id}
                          payeeName={application.worker.full_name}
                          jobId={application.job_id}
                          jobTitle={application.job.title}
                          payRate={application.job.pay_rate}
                        >
                          <Button variant="default" size="sm">
                            <DollarSign className="w-4 h-4 mr-1" />
                            Pay Worker
                          </Button>
                        </PaymentForm>
                        <ReviewForm
                          revieweeId={application.worker_id}
                          revieweeName={application.worker.full_name}
                          jobId={application.job_id}
                          jobTitle={application.job.title}
                        >
                          <Button variant="outline" size="sm">
                            <Star className="w-4 h-4 mr-1" />
                            Leave Review
                          </Button>
                        </ReviewForm>
                        <StartChatButton
                          targetUserId={application.worker_id}
                          jobId={application.job_id}
                          variant="outline"
                          size="sm"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </StartChatButton>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="detail">
          {selectedApplication ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={selectedApplication.worker.profile_photo_url || ''} />
                      <AvatarFallback className="text-lg">
                        {selectedApplication.worker.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <CardTitle className="text-xl">{selectedApplication.worker.full_name}</CardTitle>
                      <CardDescription>
                        Applied for: {selectedApplication.job.title}
                      </CardDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge 
                          variant="secondary" 
                          className={`text-${getStatusColor(selectedApplication.status)}-600`}
                        >
                          {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                        </Badge>
                        {selectedApplication.worker.is_verified && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Shield className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Contact Information */}
                  <div>
                    <h3 className="font-medium mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedApplication.worker.phone || 'No phone provided'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedApplication.worker.address || 'No address provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {selectedApplication.worker.bio && (
                    <div>
                      <h3 className="font-medium mb-3">Professional Bio</h3>
                      <p className="text-sm text-muted-foreground">{selectedApplication.worker.bio}</p>
                    </div>
                  )}

                  {/* Skills */}
                  {selectedApplication.worker.skills && selectedApplication.worker.skills.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-3">Skills ({selectedApplication.worker.skills.length})</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.worker.skills.map((skill, index) => (
                          <Badge key={index} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Documents */}
                  <div>
                    <h3 className="font-medium mb-3">Documents</h3>
                    <div className="space-y-2">
                      {selectedApplication.worker.resume_url && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <span>Resume</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocument(selectedApplication.worker.resume_url)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      )}

                      {selectedApplication.worker.identity_document_url && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                            <span>Identity Document</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDocument(selectedApplication.worker.identity_document_url)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </div>
                      )}
                      
                      {selectedApplication.worker.certification_urls && selectedApplication.worker.certification_urls.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Certifications ({selectedApplication.worker.certification_urls.length})</p>
                          {selectedApplication.worker.certification_urls.map((cert, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-2">
                              <div className="flex items-center space-x-3">
                                <Award className="w-5 h-5 text-muted-foreground" />
                                <span>Certificate {index + 1}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDocument(cert)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {selectedApplication.status === 'pending' && (
                    <div className="flex space-x-4 pt-4 border-t">
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id, 'accepted')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept Application
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id, 'rejected')}
                        variant="outline"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Application
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Job History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="w-5 h-5" />
                    <span>Previous Job History</span>
                  </CardTitle>
                  <CardDescription>
                    Past work experience and client reviews
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Loading job history...</p>
                    </div>
                  ) : workerJobHistory.length === 0 ? (
                    <div className="text-center py-4">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">No previous job history available</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {workerJobHistory.map((job) => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{job.job_title}</h4>
                              <p className="text-sm text-muted-foreground">{job.employer_name}</p>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-1">
                                {renderStars(job.rating)}
                                <span className="text-sm text-muted-foreground ml-2">
                                  {job.rating}/5
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {formatDate(job.completed_at)}
                              </p>
                            </div>
                          </div>
                          {job.review_text && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              "{job.review_text}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No application selected</h3>
                <p className="text-muted-foreground">
                  Select an application from the list to view detailed information
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
