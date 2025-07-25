import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { StartChatButton } from '@/components/messaging/StartChatButton';
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Clock, 
  Calendar, 
  Briefcase,
  Filter,
  CheckCircle,
  MessageCircle,
  Shield
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  description: string;
  required_skills: string[];
  location: string;
  pay_rate: string;
  duration: string;
  deadline: string | null;
  status: string;
  employer_id: string;
  created_at: string;
  employer: {
    id: string;
    full_name: string;
    company_name: string;
  };
}

interface JobBrowserProps {
  className?: string;
}

export const JobBrowser = ({ className }: JobBrowserProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [payRateFilter, setPayRateFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchAppliedJobs();
    
    // Set up real-time subscription for job updates
    const channel = supabase
      .channel('job-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          setJobs(prevJobs => 
            prevJobs.map(job => 
              job.id === payload.new.id 
                ? { ...job, ...payload.new }
                : job
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchTerm, locationFilter, skillFilter, payRateFilter, profile]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          employer:profiles!employer_id(
            id,
            full_name,
            company_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
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

  const fetchAppliedJobs = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('job_id')
        .eq('worker_id', profile.id);

      if (error) throw error;
      
      const appliedJobIds = new Set(data?.map(app => app.job_id) || []);
      setAppliedJobs(appliedJobIds);
    } catch (error: any) {
      console.error('Failed to fetch applied jobs:', error);
    }
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.required_skills.some(skill => 
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Location filter
    if (locationFilter) {
      filtered = filtered.filter(job =>
        job.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Skill filter - show jobs that match worker's skills
    if (skillFilter === 'my-skills' && profile?.skills) {
      filtered = filtered.filter(job =>
        job.required_skills.some(requiredSkill =>
          profile.skills?.some(userSkill =>
            userSkill.toLowerCase() === requiredSkill.toLowerCase()
          )
        )
      );
    } else if (skillFilter && skillFilter !== 'my-skills') {
      filtered = filtered.filter(job =>
        job.required_skills.some(skill =>
          skill.toLowerCase().includes(skillFilter.toLowerCase())
        )
      );
    }

    // Pay rate filter
    if (payRateFilter) {
      filtered = filtered.filter(job =>
        job.pay_rate.toLowerCase().includes(payRateFilter.toLowerCase())
      );
    }

    // Show only jobs that match worker's availability
    if (profile?.availability_status === 'offline') {
      // If worker is offline, don't filter out jobs but show a message
    }

    setFilteredJobs(filtered);
  };

  const handleApplyToJob = async (jobId: string) => {
    if (!profile?.id) {
      toast({
        title: 'Error',
        description: 'Profile not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    // Check if worker is verified
    if (!profile.is_verified) {
      toast({
        title: 'Verification Required',
        description: 'You must be verified by an administrator before applying for jobs.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Create application record
      const { error: applicationError } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          worker_id: profile.id,
          status: 'pending'
        });

      if (applicationError) {
        if (applicationError.code === '23505') { // Unique constraint violation
          toast({
            title: 'Already Applied',
            description: 'You have already applied for this job.',
            variant: 'destructive',
          });
          return;
        }
        throw applicationError;
      }

      // Log activity
      const { error: logError } = await supabase.rpc('log_activity', {
        activity_type: 'job_application',
        description: `Applied for job: ${jobs.find(j => j.id === jobId)?.title || 'Unknown Job'}`,
        metadata: { job_id: jobId }
      });

      if (logError) {
        console.error('Failed to log activity:', logError);
      }

      toast({
        title: 'Application Submitted',
        description: 'Your application has been submitted successfully!',
      });

      // Refresh jobs and applications to update application status
      fetchJobs();
      fetchAppliedJobs();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMatchingSkills = (jobSkills: string[]) => {
    if (!profile?.skills) return [];
    return jobSkills.filter(jobSkill =>
      profile.skills?.some(userSkill =>
        userSkill.toLowerCase() === jobSkill.toLowerCase()
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Loading jobs...</h3>
          <p className="text-muted-foreground">Finding opportunities for you</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Browse Jobs</CardTitle>
              <CardDescription>
                Find opportunities that match your skills and preferences
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs by title, description, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Input
                  placeholder="Filter by location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Skills</label>
                <Select value={skillFilter} onValueChange={setSkillFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by skills" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All skills</SelectItem>
                    <SelectItem value="my-skills">Match my skills</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Pay Rate</label>
                <Input
                  placeholder="Filter by pay rate"
                  value={payRateFilter}
                  onChange={(e) => setPayRateFilter(e.target.value)}
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setLocationFilter('');
                    setSkillFilter('');
                    setPayRateFilter('');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Warning */}
      {!profile?.is_verified && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <Shield className="h-5 w-5" />
              <div>
                <p className="font-medium">Verification Required</p>
                <p className="text-sm">You must be verified by an administrator before you can apply for jobs.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability Warning */}
      {profile?.is_verified && profile?.availability_status === 'offline' && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Briefcase className="h-5 w-5" />
              <p className="font-medium">
                You're currently offline. Set your availability to "online" to be visible to employers.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No jobs found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or check back later for new opportunities.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const matchingSkills = getMatchingSkills(job.required_skills);
            const skillMatch = job.required_skills.length > 0 
              ? Math.round((matchingSkills.length / job.required_skills.length) * 100)
              : 0;

            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        {skillMatch > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {skillMatch}% skill match
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {job.employer?.company_name || job.employer?.full_name} • Posted {formatDate(job.created_at)}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {job.status === 'closed' && (
                        <Badge variant="secondary" className="text-xs">
                          Closed
                        </Badge>
                      )}
                      <Button
                        onClick={() => handleApplyToJob(job.id)}
                        disabled={
                          profile?.availability_status === 'offline' || 
                          appliedJobs.has(job.id) || 
                          !profile?.is_verified ||
                          job.status === 'closed'
                        }
                        variant={appliedJobs.has(job.id) ? "secondary" : "default"}
                      >
                        {appliedJobs.has(job.id) ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Applied
                          </>
                        ) : job.status === 'closed' ? (
                          'Applications Closed'
                        ) : !profile?.is_verified ? (
                          'Verification Required'
                        ) : (
                          'Apply'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {job.description}
                  </p>

                  {/* Skills */}
                  {job.required_skills.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Required Skills:</p>
                      <div className="flex flex-wrap gap-1">
                        {job.required_skills.map((skill) => {
                          const isMatching = matchingSkills.includes(skill);
                          return (
                            <Badge 
                              key={skill} 
                              variant={isMatching ? "default" : "outline"} 
                              className="text-xs"
                            >
                              {skill}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Job Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{job.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>रु {job.pay_rate}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{job.duration}</span>
                    </div>
                    
                    {job.deadline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Due: {formatDate(job.deadline)}</span>
                      </div>
                    )}
                  </div>

                  {/* Contact Employer */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <StartChatButton
                      targetUserId={job.employer_id}
                      jobId={job.id}
                      variant="outline"
                      size="sm"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Employer
                    </StartChatButton>
                    
                    <div className="text-xs text-muted-foreground">
                      Posted: {formatDate(job.created_at)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};