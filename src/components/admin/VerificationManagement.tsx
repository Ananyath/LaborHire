import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  ShieldX, 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter
} from 'lucide-react';

interface VerificationRequest {
  id: string;
  user_id: string;
  verification_type: string;
  document_urls: string[];
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_comments?: string;
  rejection_reason?: string;
  profiles?: {
    id: string;
    full_name: string;
    email?: string;
    profile_photo_url?: string;
    role: string;
  };
}

export const VerificationManagement = () => {
  const { toast } = useToast();
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchVerificationRequests();
  }, []);

  const fetchVerificationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            role,
            profile_photo_url
          )
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setVerificationRequests((data as any) || []);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch verification requests.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationAction = async (requestId: string, action: 'approved' | 'rejected', comments?: string, reason?: string) => {
    try {
      // Get the verification request to access user_id
      const selectedReq = verificationRequests.find(req => req.id === requestId);
      if (!selectedReq) throw new Error('Verification request not found');

      // Update verification request status
      const { error } = await supabase
        .from('verification_requests')
        .update({
          status: action,
          reviewed_at: new Date().toISOString(),
          reviewer_comments: comments || null,
          rejection_reason: reason || null
        })
        .eq('id', requestId);

      if (error) throw error;

      // If approved, update the user's is_verified status in profiles
      if (action === 'approved') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', selectedReq.user_id);

        if (profileError) {
          console.error('Error updating profile verification status:', profileError);
          // Continue execution even if profile update fails
        }
      }

      // Log admin activity
      await supabase.rpc('log_admin_activity', {
        action_type: 'verification_review',
        description: `${action} verification request with comments: ${comments || reason || 'No comments'}`,
        target_type: 'verification_request',
        target_id: requestId
      });

      toast({
        title: 'Success',
        description: `Verification request ${action} successfully.`,
      });

      fetchVerificationRequests();
      setReviewComments('');
      setRejectionReason('');
    } catch (error) {
      console.error('Error updating verification request:', error);
      toast({
        title: 'Error',
        description: 'Failed to update verification request.',
        variant: 'destructive',
      });
    }
  };

  const filteredRequests = verificationRequests.filter(request => {
    const matchesSearch = request.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.verification_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesType = filterType === 'all' || request.verification_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, label: 'Pending', icon: Clock, color: 'text-yellow-600' },
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle, color: 'text-red-600' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      identity: { variant: 'default' as const, label: 'Identity', color: 'text-blue-600' },
      skills: { variant: 'secondary' as const, label: 'Skills', color: 'text-purple-600' },
      employer: { variant: 'outline' as const, label: 'Employer', color: 'text-green-600' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.identity;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div>Loading verification requests...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5" />
            <span>Verification Management</span>
          </CardTitle>
          <CardDescription>
            Review and manage user verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search Requests</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type-filter">Filter by Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="identity">Identity</SelectItem>
                  <SelectItem value="skills">Skills</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Verification Requests Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={request.profiles?.profile_photo_url} />
                          <AvatarFallback>
                            {request.profiles?.full_name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{request.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {request.profiles?.role}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTypeBadge(request.verification_type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(request.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{request.document_urls.length} docs</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Verification Request Details</DialogTitle>
                              <DialogDescription>
                                Review verification request for {request.profiles?.full_name}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* Request Details */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>User</Label>
                                  <p className="text-sm font-medium">{request.profiles?.full_name}</p>
                                </div>
                                <div>
                                  <Label>Type</Label>
                                  {getTypeBadge(request.verification_type)}
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  {getStatusBadge(request.status)}
                                </div>
                                <div>
                                  <Label>Submitted</Label>
                                  <p className="text-sm">{new Date(request.submitted_at).toLocaleString()}</p>
                                </div>
                              </div>

                              {/* Documents */}
                              <div>
                                <Label>Documents ({request.document_urls.length})</Label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                  {request.document_urls.map((url, index) => (
                                    <Card key={index} className="p-4">
                                      <div className="flex items-center space-x-2">
                                        <FileText className="w-4 h-4" />
                                        <span className="text-sm">Document {index + 1}</span>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => window.open(url, '_blank')}
                                        >
                                          View
                                        </Button>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>

                              {/* Previous Review */}
                              {request.reviewed_at && (
                                <div>
                                  <Label>Previous Review</Label>
                                  <div className="p-4 bg-muted rounded-lg mt-2">
                                    <p className="text-sm">
                                      <strong>Reviewed:</strong> {new Date(request.reviewed_at).toLocaleString()}
                                    </p>
                                    {request.reviewer_comments && (
                                      <p className="text-sm mt-2">
                                        <strong>Comments:</strong> {request.reviewer_comments}
                                      </p>
                                    )}
                                    {request.rejection_reason && (
                                      <p className="text-sm mt-2">
                                        <strong>Rejection Reason:</strong> {request.rejection_reason}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              {request.status === 'pending' && (
                                <div className="border-t pt-4">
                                  <Label className="text-base font-semibold">Review Actions</Label>
                                  <div className="grid grid-cols-2 gap-4 mt-4">
                                    {/* Approve */}
                                    <div className="space-y-2">
                                      <Label>Approve Request</Label>
                                      <Textarea
                                        placeholder="Add comments (optional)..."
                                        value={reviewComments}
                                        onChange={(e) => setReviewComments(e.target.value)}
                                      />
                                      <Button
                                        className="w-full"
                                        onClick={() => handleVerificationAction(request.id, 'approved', reviewComments)}
                                      >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                      </Button>
                                    </div>

                                    {/* Reject */}
                                    <div className="space-y-2">
                                      <Label>Reject Request</Label>
                                      <Textarea
                                        placeholder="Rejection reason (required)..."
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                      />
                                      <Button
                                        variant="destructive"
                                        className="w-full"
                                        onClick={() => handleVerificationAction(request.id, 'rejected', undefined, rejectionReason)}
                                        disabled={!rejectionReason.trim()}
                                      >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Quick Actions for Pending Requests */}
                        {request.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerificationAction(request.id, 'approved', 'Quick approval')}
                              title="Quick Approve"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerificationAction(request.id, 'rejected', undefined, 'Quick rejection')}
                              title="Quick Reject"
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredRequests.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No verification requests found.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};