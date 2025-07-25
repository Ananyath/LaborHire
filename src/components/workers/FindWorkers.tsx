import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StartChatButton } from '@/components/messaging/StartChatButton';
import { UserRatingDisplay } from '@/components/reviews/UserRatingDisplay';
import { 
  Search, 
  MapPin, 
  User, 
  Users,
  MessageCircle,
  UserPlus,
  Shield
} from 'lucide-react';

interface Worker {
  id: string;
  user_id: string;
  full_name: string;
  address?: string;
  bio?: string;
  skills: string[];
  profile_photo_url?: string;
  is_verified: boolean;
  availability_status: string;
  language_preference: string;
  resume_url?: string;
}

export const FindWorkers = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Common skills for filter dropdown
  const commonSkills = [
    'Construction', 'Plumbing', 'Electrical Work', 'Carpentry', 'Painting',
    'Landscaping', 'Cleaning', 'Moving', 'Handyman', 'Roofing',
    'Flooring', 'Welding', 'HVAC', 'Masonry', 'Drywall',
    'Kitchen Work', 'Warehouse', 'Delivery', 'Security', 'Maintenance'
  ];

  useEffect(() => {
    if (profile?.role === 'employer') {
      fetchWorkers();
    }
  }, [profile]);

  useEffect(() => {
    filterWorkers();
  }, [workers, searchTerm, locationFilter, skillFilter]);

  const fetchWorkers = async () => {
    try {
      // First verify current user is an employer
      if (profile?.role !== 'employer') {
        setLoading(false);
        return;
      }

      // Fetch worker profiles using a direct query with explicit permission check
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'worker')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkers(data || []);
    } catch (error: any) {
      console.error('Error fetching workers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load workers.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterWorkers = () => {
    let filtered = [...workers];

    // Search by name or bio
    if (searchTerm.trim()) {
      filtered = filtered.filter(worker => 
        worker.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        worker.bio?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by location
    if (locationFilter.trim()) {
      filtered = filtered.filter(worker => 
        worker.address?.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Filter by skills
    if (skillFilter && skillFilter !== 'all') {
      filtered = filtered.filter(worker => 
        worker.skills?.some(skill => 
          skill.toLowerCase().includes(skillFilter.toLowerCase())
        )
      );
    }


    setFilteredWorkers(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setSkillFilter('all');
  };

  const inviteToJob = async (workerId: string, workerName: string) => {
    // This would typically open a job selection dialog
    // For now, we'll just show a toast
    toast({
      title: 'Feature Coming Soon',
      description: `Direct job invitations to ${workerName} will be available soon.`,
    });
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Loading workers...</h3>
          <p className="text-muted-foreground">Finding available talent for you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Search className="w-5 h-5" />
                <span>Find Workers</span>
              </CardTitle>
              <CardDescription>
                Search for skilled workers based on your requirements
              </CardDescription>
            </div>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Location</label>
              <Input
                placeholder="Enter location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Skills</label>
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select skill" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Skills</SelectItem>
                  {commonSkills.map((skill) => (
                    <SelectItem key={skill} value={skill}>
                      {skill}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium block">Other</label>
              <div className="text-sm text-muted-foreground">
                Additional filters coming soon
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} found</span>
            {(searchTerm || locationFilter || (skillFilter && skillFilter !== 'all')) && (
              <span>({workers.length} total)</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workers Grid */}
      {filteredWorkers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No workers found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search criteria to find more workers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWorkers.map((worker) => (
            <Card key={worker.id} className="hover:shadow-lg transition-all duration-200 flex flex-col h-full">
              <CardHeader className="text-center">
                <Avatar className="w-20 h-20 mx-auto mb-3">
                  <AvatarImage src={worker.profile_photo_url || ''} />
                  <AvatarFallback className="text-lg">
                    {worker.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <CardTitle className="text-lg">{worker.full_name}</CardTitle>
                  <div className="flex items-center justify-center space-x-2 mt-2">
                    <Badge 
                      variant={worker.availability_status === 'online' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {worker.availability_status}
                    </Badge>
                    {worker.is_verified && (
                      <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-2">
                    <UserRatingDisplay userId={worker.id} size="sm" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 flex-1 flex flex-col">
                {/* Location */}
                {worker.address && (
                  <div className="flex items-center space-x-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{worker.address}</span>
                  </div>
                )}

                {/* Bio */}
                {worker.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {worker.bio}
                  </p>
                )}

                {/* Skills */}
                {worker.skills && worker.skills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {worker.skills.slice(0, 4).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {worker.skills.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{worker.skills.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}


                {/* Spacer to push buttons to bottom */}
                <div className="flex-1"></div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4 mt-auto">
                  <StartChatButton
                    targetUserId={worker.id}
                    variant="outline"
                    size="sm"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </StartChatButton>
                  
                  {worker.resume_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const { data } = supabase.storage.from('resumes').getPublicUrl(worker.resume_url!);
                        window.open(data.publicUrl, '_blank');
                      }}
                    >
                      View Resume
                    </Button>
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