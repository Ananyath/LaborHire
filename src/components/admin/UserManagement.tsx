import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { 
  Users, 
  Search, 
  Shield, 
  ShieldCheck, 
  ShieldX,
  MoreHorizontal,
  UserPlus,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  UserCheck,
  UserX,
  Ban,
  Eye
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  phone?: string;
  is_verified: boolean;
  created_at: string;
  profile_photo_url?: string;
  availability_status: string;
  skills?: string[];
  company_name?: string;
  user_status: string;
  approval_status: string;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  deleted_at?: string;
}

interface AdminProfile {
  id: string;
  user_id: string;
  admin_role: string;
  created_at: string;
}

export const UserManagement = () => {
  const { toast } = useToast();
  const { hasRole } = useAdminAccess();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [passwordResetReason, setPasswordResetReason] = useState('');
  const [approvalReason, setApprovalReason] = useState('');

  useEffect(() => {
    fetchProfiles();
    fetchAdminProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch user profiles.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*');

      if (error) throw error;
      setAdminProfiles(data || []);
    } catch (error) {
      console.error('Error fetching admin profiles:', error);
    }
  };

  const handleVerificationToggle = async (profileId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: !currentStatus })
        .eq('id', profileId);

      if (error) throw error;

      setProfiles(profiles.map(p => 
        p.id === profileId ? { ...p, is_verified: !currentStatus } : p
      ));

      // Log admin activity
      await supabase.rpc('log_admin_activity', {
        action_type: 'user_verification',
        description: `${!currentStatus ? 'Verified' : 'Unverified'} user profile`,
        target_type: 'profile',
        target_id: profileId
      });

      toast({
        title: 'Success',
        description: `User ${!currentStatus ? 'verified' : 'unverified'} successfully.`,
      });
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user verification status.',
        variant: 'destructive',
      });
    }
  };

  const createAdminProfile = async (userId: string, adminRole: 'super_admin' | 'admin' | 'moderator') => {
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .insert({
          user_id: userId,
          admin_role: adminRole as any
        });

      if (error) throw error;

      // Log admin activity
      await supabase.rpc('log_admin_activity', {
        action_type: 'admin_creation',
        description: `Created ${adminRole} admin profile`,
        target_type: 'admin_profile',
        target_id: userId
      });

      toast({
        title: 'Success',
        description: 'Admin profile created successfully.',
      });

      fetchAdminProfiles();
      setIsCreateAdminOpen(false);
    } catch (error) {
      console.error('Error creating admin profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to create admin profile.',
        variant: 'destructive',
      });
    }
  };

  const handleUserDeletion = async (profileId: string) => {
    try {
      const { error } = await supabase.rpc('soft_delete_user', {
        target_user_id: profileId
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User deleted successfully.',
      });

      fetchProfiles();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const handleUserApproval = async (profileId: string, status: 'approved' | 'rejected', reason?: string) => {
    try {
      const { error } = await supabase.rpc('update_user_approval', {
        target_user_id: profileId,
        new_status: status,
        reason: reason || null
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `User ${status} successfully.`,
      });

      fetchProfiles();
      setApprovalReason('');
    } catch (error) {
      console.error('Error updating user approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user approval.',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordReset = async (profileId: string, reason?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: {
          targetUserId: profileId,
          resetReason: reason || ''
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password reset email sent successfully.',
      });

      setPasswordResetReason('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset user password.',
        variant: 'destructive',
      });
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || profile.role === filterRole;
    const matchesStatus = filterStatus === 'all' || profile.user_status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      online: { variant: 'default' as const, label: 'Online' },
      busy: { variant: 'secondary' as const, label: 'Busy' },
      offline: { variant: 'outline' as const, label: 'Offline' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.offline;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUserStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, label: 'Active', color: 'text-green-600' },
      suspended: { variant: 'secondary' as const, label: 'Suspended', color: 'text-yellow-600' },
      banned: { variant: 'destructive' as const, label: 'Banned', color: 'text-red-600' },
      pending_approval: { variant: 'outline' as const, label: 'Pending', color: 'text-blue-600' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getApprovalBadge = (status: string) => {
    const statusConfig = {
      approved: { variant: 'default' as const, label: 'Approved', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, label: 'Rejected', icon: XCircle },
      pending: { variant: 'outline' as const, label: 'Pending', icon: Eye }
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

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>User Management</span>
          </CardTitle>
          <CardDescription>
            Manage platform users, verification status, and admin roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users" className="space-y-4">
            <TabsList>
              <TabsTrigger value="users">All Users</TabsTrigger>
              <TabsTrigger value="admins">Admin Users</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="role-filter">Filter by Role</Label>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="worker">Workers</SelectItem>
                      <SelectItem value="employer">Employers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status-filter">Filter by Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="banned">Banned</SelectItem>
                      <SelectItem value="pending_approval">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Users Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>User Status</TableHead>
                      <TableHead>Approval</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={profile.profile_photo_url} />
                              <AvatarFallback>
                                {profile.full_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{profile.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {profile.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {profile.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getUserStatusBadge(profile.user_status)}
                        </TableCell>
                        <TableCell>
                          {getApprovalBadge(profile.approval_status)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerificationToggle(profile.id, profile.is_verified)}
                            className="p-1 hover:bg-secondary"
                            title={profile.is_verified ? "Click to unverify user" : "Click to verify user"}
                          >
                            {profile.is_verified ? (
                              <ShieldCheck className="w-5 h-5 text-green-600" />
                            ) : (
                              <ShieldX className="w-5 h-5 text-orange-600" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(profile.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedProfile(profile)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>User Management - {profile.full_name}</DialogTitle>
                                  <DialogDescription>
                                    Manage user account and permissions
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6">
                                  {/* User Details */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label>Full Name</Label>
                                      <p className="text-sm font-medium">{profile.full_name}</p>
                                    </div>
                                    <div>
                                      <Label>Role</Label>
                                      <p className="text-sm capitalize">{profile.role}</p>
                                    </div>
                                    <div>
                                      <Label>User Status</Label>
                                      {getUserStatusBadge(profile.user_status)}
                                    </div>
                                    <div>
                                      <Label>Approval Status</Label>
                                      {getApprovalBadge(profile.approval_status)}
                                    </div>
                                    {profile.phone && (
                                      <div>
                                        <Label>Phone</Label>
                                        <p className="text-sm">{profile.phone}</p>
                                      </div>
                                    )}
                                    {profile.company_name && (
                                      <div>
                                        <Label>Company</Label>
                                        <p className="text-sm">{profile.company_name}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Skills */}
                                  {profile.skills && profile.skills.length > 0 && (
                                    <div>
                                      <Label>Skills</Label>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {profile.skills.map((skill, index) => (
                                          <Badge key={index} variant="secondary" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Admin Actions */}
                                  <div className="border-t pt-4">
                                    <Label className="text-base font-semibold">Admin Actions</Label>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                      
                                      {/* Approval Actions */}
                                      {profile.approval_status === 'pending' && (
                                        <div className="space-y-2">
                                          <Label>User Approval</Label>
                                          <div className="flex gap-2">
                                            {hasRole('super_admin') ? (
                                              // Super Admin - Direct approval without confirmation
                                              <Button 
                                                variant="default" 
                                                size="sm"
                                                onClick={() => handleUserApproval(profile.id, 'approved')}
                                              >
                                                <UserCheck className="w-4 h-4 mr-1" />
                                                Approve
                                              </Button>
                                            ) : (
                                              // Regular Admin - With confirmation
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                  <Button variant="default" size="sm">
                                                    <UserCheck className="w-4 h-4 mr-1" />
                                                    Approve
                                                  </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                  <AlertDialogHeader>
                                                    <AlertDialogTitle>Approve User</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                      Are you sure you want to approve this user?
                                                    </AlertDialogDescription>
                                                  </AlertDialogHeader>
                                                  <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleUserApproval(profile.id, 'approved')}>
                                                      Approve
                                                    </AlertDialogAction>
                                                  </AlertDialogFooter>
                                                </AlertDialogContent>
                                              </AlertDialog>
                                            )}
                                            
                                            {hasRole('super_admin') ? (
                                              // Super Admin - Direct rejection without reason requirement
                                              <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleUserApproval(profile.id, 'rejected', 'Rejected by Super Admin')}
                                              >
                                                <UserX className="w-4 h-4 mr-1" />
                                                Reject
                                              </Button>
                                            ) : (
                                              // Regular Admin - With reason requirement
                                              <Dialog>
                                                <DialogTrigger asChild>
                                                  <Button variant="destructive" size="sm">
                                                    <UserX className="w-4 h-4 mr-1" />
                                                    Reject
                                                  </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                  <DialogHeader>
                                                    <DialogTitle>Reject User</DialogTitle>
                                                    <DialogDescription>
                                                      Please provide a reason for rejecting this user.
                                                    </DialogDescription>
                                                  </DialogHeader>
                                                  <div className="space-y-4">
                                                    <Textarea
                                                      placeholder="Enter rejection reason..."
                                                      value={approvalReason}
                                                      onChange={(e) => setApprovalReason(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                      <Button 
                                                        variant="destructive" 
                                                        onClick={() => handleUserApproval(profile.id, 'rejected', approvalReason)}
                                                        disabled={!approvalReason.trim()}
                                                      >
                                                        Reject User
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </DialogContent>
                                              </Dialog>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Password Reset - Super Admin Only */}
                                      {hasRole('super_admin') && (
                                        <div className="space-y-2">
                                          <Label>Password Management</Label>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="outline" size="sm">
                                                <Key className="w-4 h-4 mr-1" />
                                                Reset Password
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Reset User Password</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This will immediately reset the user's password and send them a recovery email.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handlePasswordReset(profile.id)}>
                                                  Reset Password
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      )}

                                      {/* User Deletion - Admin Only */}
                                      {(hasRole('super_admin') || hasRole('admin')) && (
                                        <div className="space-y-2">
                                          <Label>Danger Zone</Label>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button variant="destructive" size="sm">
                                                <Trash2 className="w-4 h-4 mr-1" />
                                                Delete User
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This will permanently disable the user account. This action cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleUserDeletion(profile.id)}>
                                                  Delete User
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            
                            {/* Quick Actions for Super Admin */}
                            {hasRole('super_admin') && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePasswordReset(profile.id)}
                                  title="Reset Password"
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <Key className="w-4 h-4" />
                                </Button>
                                {profile.approval_status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUserApproval(profile.id, 'approved')}
                                      title="Quick Approve"
                                    >
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleUserApproval(profile.id, 'rejected', 'Quick rejection by Super Admin')}
                                      title="Quick Reject"
                                    >
                                      <XCircle className="w-4 h-4 text-red-600" />
                                    </Button>
                                  </>
                                )}
                              </>
                            )}
                            
                            {/* Quick Actions for Regular Admins */}
                            {!hasRole('super_admin') && profile.approval_status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUserApproval(profile.id, 'approved')}
                                  title="Quick Approve"
                                >
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUserApproval(profile.id, 'rejected', 'Quick rejection')}
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
              </div>
            </TabsContent>

            <TabsContent value="admins" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Admin Users</h3>
                <Dialog open={isCreateAdminOpen} onOpenChange={setIsCreateAdminOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Admin Profile</DialogTitle>
                      <DialogDescription>
                        Grant admin privileges to a user
                      </DialogDescription>
                    </DialogHeader>
                    {/* Admin creation form would go here */}
                    <p className="text-sm text-muted-foreground">
                      Admin creation form implementation needed
                    </p>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminProfiles.map((adminProfile) => {
                      const profile = profiles.find(p => p.id === adminProfile.user_id);
                      return (
                        <TableRow key={adminProfile.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={profile?.profile_photo_url} />
                                <AvatarFallback>
                                  {profile?.full_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{profile?.full_name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {profile?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="default" className="capitalize">
                              <Shield className="w-3 h-3 mr-1" />
                              {adminProfile.admin_role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(adminProfile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};