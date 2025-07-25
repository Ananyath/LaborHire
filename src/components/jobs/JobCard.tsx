
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, DollarSign, Calendar, Users, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  pay_rate: string;
  duration: string;
  deadline: string | null;
  status: string;
  required_skills: string[];
  created_at: string;
  applications?: { count: number }[];
}

interface JobCardProps {
  job: Job;
  onEdit?: (job: Job) => void;
  onDelete?: (jobId: string) => void;
  onApply?: (jobId: string) => void;
  onUpdate?: () => void;
  onStatusChange?: (jobId: string, newStatus: string) => void;
  showActions?: boolean;
  showEdit?: boolean;
}

export const JobCard = ({ 
  job, 
  onEdit, 
  onDelete, 
  onApply, 
  onStatusChange, 
  showActions = true, 
  showEdit = true 
}: JobCardProps) => {
  const { profile } = useAuth();
  const isEmployer = profile?.role === 'employer';
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const applicationCount = job.applications?.[0]?.count || 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{job.title}</CardTitle>
            <CardDescription className="flex items-center space-x-2 mt-1">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
            </CardDescription>
          </div>
          <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>
            {job.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {job.description}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center space-x-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span>रु {job.pay_rate}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{job.duration}</span>
          </div>
          {job.deadline && (
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Due: {formatDate(job.deadline)}</span>
            </div>
          )}
        </div>

        {job.required_skills && job.required_skills.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Required Skills:</p>
            <div className="flex flex-wrap gap-1">
              {job.required_skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {job.required_skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{job.required_skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {showActions && (
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              Posted {formatDate(job.created_at)}
            </div>
            
            <div className="flex justify-between items-center space-x-2">
              {applicationCount > 0 && isEmployer && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{applicationCount} applications</span>
                </div>
              )}
              
              <div className="flex space-x-2">
                {isEmployer ? (
                  <>
                    {/* Status Dropdown */}
                    <Select 
                      value={job.status} 
                      onValueChange={(value) => onStatusChange?.(job.id, value)}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue>
                          <div className="flex items-center space-x-1">
                            {job.status === 'open' ? (
                              <CheckCircle className="w-3 h-3 text-green-600" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-600" />
                            )}
                            <span className="capitalize">{job.status}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-3 h-3 text-green-600" />
                            <span>Open</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="closed">
                          <div className="flex items-center space-x-2">
                            <XCircle className="w-3 h-3 text-red-600" />
                            <span>Closed</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Edit Button - Only show if showEdit is true */}
                    {showEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit?.(job)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}

                    {/* Delete Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete?.(job.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => onApply?.(job.id)}
                    disabled={job.status !== 'open'}
                  >
                    {job.status === 'open' ? 'Apply Now' : 'Applications Closed'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
