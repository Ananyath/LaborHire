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
import { ReviewsDisplay } from '@/components/reviews/ReviewsDisplay';
import { UserRatingDisplay } from '@/components/reviews/UserRatingDisplay';
import { 
  Upload, 
  Building, 
  Shield, 
  User,
  Camera,
  Loader2,
  FileText,
  ArrowLeft
} from 'lucide-react';

const EmployerProfile = () => {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();
  const { uploadFile, uploading } = useFileUpload();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const identityInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    company_name: profile?.company_name || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    language_preference: profile?.language_preference || 'english',
    bio: profile?.bio || '',
  });

  const [updating, setUpdating] = useState(false);

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

  const handleFileUpload = async (file: File, type: 'logo' | 'identity') => {
    let bucket: string;
    let folder: string;

    switch (type) {
      case 'logo':
        bucket = 'profile-photos';
        folder = 'company-logos';
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
        case 'logo':
          updateData.profile_photo_url = url;
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

    const { error } = await updateProfile(formData);

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
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
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employer-dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-primary">Employer Profile</h1>
        <p className="text-muted-foreground">Manage your company profile and information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company Logo & Status */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="text-center">
              <div className="relative mx-auto w-32 h-32 mb-4">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.profile_photo_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {(profile.company_name || profile.full_name).split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  className="absolute bottom-0 right-0 rounded-full p-2"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'logo');
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">{profile.company_name || profile.full_name}</h3>
                <UserRatingDisplay userId={profile.id} size="sm" />
                <div className="flex items-center justify-center">
                  {profile.is_verified && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Verification */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Company Verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Business Registration</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => identityInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {profile.identity_document_url ? 'Update' : 'Upload'}
                  </Button>
                  {profile.identity_document_url && (
                    <>
                      <Badge variant="secondary">Uploaded</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(profile.identity_document_url!, '_blank')}
                      >
                        View
                      </Button>
                      <Button
                        variant="ghost"
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
                              description: 'Document removed successfully.',
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload business registration or tax documents
                </p>
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

          {/* Reviews Section */}
          <Card className="mt-6">
            <ReviewsDisplay userId={profile.id} />
          </Card>
        </div>

        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => handleInputChange('company_name', e.target.value)}
                    placeholder="Your Company Name"
                  />
                </div>
                <div>
                  <Label htmlFor="full_name">Contact Person</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    placeholder="Primary contact name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Company phone number"
                  />
                </div>
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
              </div>

              <div>
                <Label htmlFor="address">Company Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Full company address"
                />
              </div>

              <div>
                <Label htmlFor="bio">Company Description</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Describe your company, industry, and what you're looking for in workers..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Company Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Company Overview</CardTitle>
              <CardDescription>
                Key information about your hiring activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Building className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Active Jobs</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Applications</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">0</div>
                  <div className="text-sm text-muted-foreground">Hired Workers</div>
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

export default EmployerProfile;