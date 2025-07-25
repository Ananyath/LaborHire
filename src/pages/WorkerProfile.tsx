import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserRatingDisplay } from '@/components/reviews/UserRatingDisplay';
import { 
  Upload, 
  X, 
  Plus, 
  FileText, 
  Award, 
  Shield, 
  User,
  Camera,
  Loader2,
  ArrowLeft
} from 'lucide-react';

const WorkerProfile = () => {
  const { profile, updateProfile } = useAuth();
  const { uploadFile, uploading } = useFileUpload();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const certificationInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    language_preference: profile?.language_preference || 'english',
    bio: profile?.bio || '',
    availability_status: profile?.availability_status || 'offline'
  });

  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [updating, setUpdating] = useState(false);

  // Common skills for suggestions
  const commonSkills = [
    'Construction', 'Plumbing', 'Electrical Work', 'Carpentry', 'Painting',
    'Landscaping', 'Cleaning', 'Moving', 'Handyman', 'Roofing',
    'Flooring', 'Welding', 'HVAC', 'Masonry', 'Drywall',
    'Kitchen Work', 'Warehouse', 'Delivery', 'Security', 'Maintenance'
  ];

  const languageOptions = [
    { value: 'english', label: 'English' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'arabic', label: 'Arabic' },
    { value: 'hindi', label: 'Hindi' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'russian', label: 'Russian' },
    { value: 'japanese', label: 'Japanese' },
    { value: 'german', label: 'German' }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSkill = (skillToAdd?: string) => {
    const skill = skillToAdd || newSkill.trim();
    if (skill && !skills.includes(skill)) {
      setSkills([...skills, skill]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleFileUpload = async (file: File, type: 'profile' | 'resume' | 'certification' | 'identity') => {
    let bucket: string;
    let folder: string;

    switch (type) {
      case 'profile':
        bucket = 'profile-photos';
        folder = 'photos';
        break;
      case 'resume':
        bucket = 'resumes';
        folder = 'documents';
        break;
      case 'certification':
        bucket = 'certifications';
        folder = 'documents';
        break;
      case 'identity':
        bucket = 'identity-documents';
        folder = 'documents';
        break;
      default:
        return;
    }

    const { url, error } = await uploadFile(file, bucket, folder);

    if (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (url) {
      let updateData: any = {};

      switch (type) {
        case 'profile':
          updateData.profile_photo_url = url;
          break;
        case 'resume':
          updateData.resume_url = url;
          break;
        case 'certification':
          const currentCerts = profile?.certification_urls || [];
          updateData.certification_urls = [...currentCerts, url];
          break;
        case 'identity':
          updateData.identity_document_url = url;
          break;
      }

      const { error: updateError } = await updateProfile(updateData);

      if (updateError) {
        toast({
          title: 'Update failed',
          description: 'Failed to update profile with new file.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Upload successful',
          description: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully.`,
        });
      }
    }
  };

  const handleSaveProfile = async () => {
    setUpdating(true);

    const updateData = {
      ...formData,
      skills
    };

    const { error } = await updateProfile(updateData);

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Log activity
      const { error: logError } = await supabase.rpc('log_activity', {
        activity_type: 'profile_update',
        description: 'Updated profile information',
        metadata: { 
          updated_fields: Object.keys(updateData),
          timestamp: new Date().toISOString()
        }
      });

      if (logError) {
        console.error('Failed to log activity:', logError);
      }

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    }

    setUpdating(false);
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/worker-dashboard')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-primary">Worker Profile</h1>
        <p className="text-muted-foreground">Manage your professional profile and documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Photo & Status */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.profile_photo_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full p-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'profile');
                  }}
                />
              </div>
              
              <div className="flex items-center justify-center space-x-2 mb-2">
                <UserRatingDisplay userId={profile.id} size="sm" />
              </div>
              
              <div className="flex items-center justify-center space-x-2">
                <Badge variant={profile.availability_status === 'online' ? 'default' : 'secondary'}>
                  {profile.availability_status}
                </Badge>
                {profile.is_verified && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Document Uploads */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Documents</CardTitle>
              <CardDescription>Upload and manage your professional documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resume */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Resume</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resumeInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        {profile.resume_url ? 'Update Resume' : 'Upload Resume'}
                      </Button>
                      
                      {profile.resume_url && (
                        <div className="flex flex-col gap-2 p-3 bg-background rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Resume Document</span>
                              <Badge variant="secondary" className="text-xs">Uploaded</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(profile.resume_url!, '_blank')}
                              className="flex-1 sm:flex-none"
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { error } = await updateProfile({ resume_url: null });
                                if (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to remove resume.',
                                    variant: 'destructive',
                                  });
                                } else {
                                  toast({
                                    title: 'Success',
                                    description: 'Resume removed successfully.',
                                  });
                                }
                              }}
                              className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={resumeInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'resume');
                  }}
                />
              </div>

              {/* Certifications */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Certifications</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => certificationInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto"
                      >
                        <Award className="w-4 h-4 mr-2" />
                        Add Certificate
                      </Button>
                      
                      {profile.certification_urls && profile.certification_urls.length > 0 && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {profile.certification_urls.map((cert, index) => (
                            <div key={index} className="p-3 bg-background rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Award className="w-4 h-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Certificate {index + 1}</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(cert, '_blank')}
                                  className="flex-1 sm:flex-none"
                                >
                                  View
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    const updatedCerts = profile.certification_urls!.filter((_, i) => i !== index);
                                    const { error } = await updateProfile({ certification_urls: updatedCerts });
                                    if (error) {
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to remove certification.',
                                        variant: 'destructive',
                                      });
                                    } else {
                                      toast({
                                        title: 'Success',
                                        description: 'Certification removed successfully.',
                                      });
                                    }
                                  }}
                                  className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {profile.certification_urls && profile.certification_urls.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {profile.certification_urls.length} certificate(s) uploaded
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={certificationInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'certification');
                  }}
                />
              </div>

              {/* Identity Document */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Identity Verification</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => identityInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {profile.identity_document_url ? 'Update ID' : 'Upload ID'}
                      </Button>
                      
                      {profile.identity_document_url && (
                        <div className="flex flex-col gap-2 p-3 bg-background rounded-lg border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Identity Document</span>
                              <Badge variant="secondary" className="text-xs">Uploaded</Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(profile.identity_document_url!, '_blank')}
                              className="flex-1 sm:flex-none"
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                const { error } = await updateProfile({ identity_document_url: null });
                                if (error) {
                                  toast({
                                    title: 'Error',
                                    description: 'Failed to remove document.',
                                    variant: 'destructive',
                                  });
                                } else {
                                  toast({
                                    title: 'Success',
                                    description: 'Identity document removed successfully.',
                                  });
                                }
                              }}
                              className="flex-1 sm:flex-none text-destructive hover:text-destructive"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <input
                  ref={identityInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'identity');
                  }}
                />
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language Preference</Label>
                  <Select
                    value={formData.language_preference}
                    onValueChange={(value) => handleInputChange('language_preference', value)}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {languageOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="availability">Availability Status</Label>
                  <Select
                    value={formData.availability_status}
                    onValueChange={(value) => handleInputChange('availability_status', value)}
                  >
                    <SelectTrigger className="bg-background border-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell employers about your experience and expertise..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>Add your professional skills and expertise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a skill (e.g., Construction, Plumbing)"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button onClick={() => handleAddSkill()} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggested Skills */}
              {newSkill.length === 0 && skills.length < 10 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Suggested skills:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonSkills
                      .filter(skill => !skills.includes(skill))
                      .slice(0, 8)
                      .map((skill) => (
                        <Button
                          key={skill}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddSkill(skill)}
                          className="h-8 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {skill}
                        </Button>
                      ))}
                  </div>
                </div>
              )}

              {/* Current Skills */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Your skills ({skills.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer">
                      {skill}
                      <X
                        className="w-3 h-3 ml-1 hover:text-destructive"
                        onClick={() => handleRemoveSkill(skill)}
                      />
                    </Badge>
                  ))}
                  {skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No skills added yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveProfile} 
              disabled={updating}
              className="min-w-[120px]"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerProfile;