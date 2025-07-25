import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X, Plus, Calendar, MapPin, DollarSign, Clock, Shield } from 'lucide-react';

interface Job {
  id?: string;
  title: string;
  description: string;
  required_skills: string[];
  location: string;
  pay_rate: string;
  duration: string;
  deadline: string;
  status: 'open' | 'closed';
}

interface JobFormProps {
  job?: Job;
  onSuccess: () => void;
  children: React.ReactNode;
}

export const JobForm = ({ job, onSuccess, children }: JobFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Job>({
    title: job?.title || '',
    description: job?.description || '',
    required_skills: job?.required_skills || [],
    location: job?.location || '',
    pay_rate: job?.pay_rate || '',
    duration: job?.duration || '',
    deadline: job?.deadline || '',
    status: job?.status || 'open',
  });
  const [newSkill, setNewSkill] = useState('');

  const handleInputChange = (field: keyof Job, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.required_skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Check if employer is verified
    if (!profile.is_verified) {
      toast({
        title: 'Verification Required',
        description: 'You must be verified before posting jobs. Please complete the verification process.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const jobData = {
        ...formData,
        employer_id: profile.id,
        deadline: formData.deadline || null,
      };

      let result;
      if (job?.id) {
        // Update existing job
        result = await supabase
          .from('jobs')
          .update(jobData)
          .eq('id', job.id);
      } else {
        // Create new job
        result = await supabase
          .from('jobs')
          .insert(jobData);
      }

      if (result.error) {
        throw result.error;
      }

      toast({
        title: job?.id ? 'Job updated!' : 'Job posted!',
        description: job?.id ? 'Your job has been updated successfully.' : 'Your job has been posted successfully.',
      });

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An error occurred while saving the job.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job?.id ? 'Edit Job' : 'Post New Job'}</DialogTitle>
          <DialogDescription>
            {job?.id ? 'Update your job posting details.' : 'Create a new job posting to find the right workers.'}
          </DialogDescription>
        </DialogHeader>

        {/* Verification Status Warning */}
        {!profile?.is_verified && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-yellow-800">
                <Shield className="h-5 w-5" />
                <div>
                  <p className="font-medium">Verification Required</p>
                  <p className="text-sm">You must be verified by an administrator before you can post jobs.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              placeholder="e.g. Construction Worker, Electrician"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the job requirements, responsibilities, and any additional details..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Required Skills</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a skill and press Enter"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <Button type="button" onClick={addSkill} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.required_skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => removeSkill(skill)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">
                <MapPin className="inline h-4 w-4 mr-1" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="e.g. New York, NY"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay_rate">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Pay Rate (NPR)
              </Label>
              <Input
                id="pay_rate"
                placeholder="e.g. NPR 2,500/hour, NPR 50,000/month"
                value={formData.pay_rate}
                onChange={(e) => handleInputChange('pay_rate', e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter amount in Nepalese Rupees (NPR)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">
                <Clock className="inline h-4 w-4 mr-1" />
                Duration
              </Label>
              <Input
                id="duration"
                placeholder="e.g. 3 months, Permanent"
                value={formData.duration}
                onChange={(e) => handleInputChange('duration', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">
                <Calendar className="inline h-4 w-4 mr-1" />
                Application Deadline (Optional)
              </Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !profile?.is_verified}>
              {loading ? 'Saving...' : (job?.id ? 'Update Job' : 'Post Job')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};