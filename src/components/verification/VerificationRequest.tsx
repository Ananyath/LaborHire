import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useFileUpload } from '@/hooks/useFileUpload';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Upload, FileText, CheckCircle, X } from 'lucide-react';

interface VerificationRequestProps {
  onSuccess?: () => void;
}

export const VerificationRequest = ({ onSuccess }: VerificationRequestProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload();
  const [submitting, setSubmitting] = useState(false);
  const [verificationType, setVerificationType] = useState<string>('');
  const [documentUrls, setDocumentUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const bucket = verificationType === 'identity' ? 'identity-documents' : 'certifications';
      const { url, error } = await uploadFile(file, bucket);
      
      if (error || !url) {
        throw new Error(error || 'Failed to upload file');
      }

      setDocumentUrls(prev => [...prev, url]);
      toast({
        title: 'File uploaded',
        description: 'Document uploaded successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const removeDocument = (indexToRemove: number) => {
    setDocumentUrls(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !verificationType || documentUrls.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select verification type and upload at least one document.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: profile.id,
          verification_type: verificationType,
          document_urls: documentUrls,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Verification request submitted',
        description: 'Your verification request has been submitted and is being reviewed by our admin team.',
      });

      // Reset form
      setVerificationType('');
      setDocumentUrls([]);
      setNotes('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit verification request.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Verification Request
        </CardTitle>
        <CardDescription>
          Submit documents for verification to unlock platform features
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="verification-type">Verification Type</Label>
            <Select value={verificationType} onValueChange={setVerificationType}>
              <SelectTrigger>
                <SelectValue placeholder="Select verification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identity">Identity Verification</SelectItem>
                <SelectItem value="skills">Skills Certification</SelectItem>
                {profile?.role === 'employer' && (
                  <SelectItem value="employer">Employer Verification</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {verificationType === 'identity' && 'Upload government-issued ID or passport'}
              {verificationType === 'skills' && 'Upload professional certifications or licenses'}
              {verificationType === 'employer' && 'Upload business registration or license'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Documents</Label>
            <div className="space-y-4">
              {documentUrls.map((url, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Document {index + 1}</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {verificationType && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="mt-2">
                      <Label htmlFor="document-upload" className="cursor-pointer">
                        <span className="text-sm font-medium text-primary hover:text-primary/80">
                          Click to upload documents
                        </span>
                        <Input
                          id="document-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, JPG, or PNG up to 10MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information you'd like to provide..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={submitting || uploading || !verificationType || documentUrls.length === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Verification Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};