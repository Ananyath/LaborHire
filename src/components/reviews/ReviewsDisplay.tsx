import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Star, MessageSquare, Calendar, Briefcase } from 'lucide-react';

interface Review {
  id: string;
  reviewer_id: string;
  reviewee_id: string;
  job_id?: string;
  rating: number;
  review_text?: string;
  created_at: string;
  reviewer_profile: {
    id: string;
    full_name: string;
    profile_photo_url?: string;
    company_name?: string;
    role: string;
  };
  job?: {
    title: string;
  };
}

interface ReviewsDisplayProps {
  userId: string;
  className?: string;
}

export const ReviewsDisplay = ({ userId, className }: ReviewsDisplayProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchReviews();
      fetchStats();
    }
  }, [userId]);

  const fetchReviews = async () => {
    try {
      // First get the reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        return;
      }

      // Get reviewer profile IDs
      const reviewerIds = reviewsData.map(review => review.reviewer_id);
      const jobIds = reviewsData.filter(review => review.job_id).map(review => review.job_id);

      // Get reviewer profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, profile_photo_url, company_name, role')
        .in('id', reviewerIds);

      if (profilesError) throw profilesError;

      // Get job titles if there are job IDs
      let jobsData: any[] = [];
      if (jobIds.length > 0) {
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select('id, title')
          .in('id', jobIds);

        if (jobsError) throw jobsError;
        jobsData = jobs || [];
      }

      // Combine the data
      const transformedData = reviewsData.map(review => {
        const reviewerProfile = profilesData?.find(profile => profile.id === review.reviewer_id);
        const job = jobsData.find(job => job.id === review.job_id);

        return {
          ...review,
          reviewer_profile: reviewerProfile || {
            id: review.reviewer_id,
            full_name: 'Unknown User',
            role: 'unknown'
          },
          job: job ? { title: job.title } : undefined
        };
      });

      setReviews(transformedData);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get average rating using the database function
      const { data: avgData, error: avgError } = await supabase
        .rpc('calculate_average_rating', { user_profile_id: userId });

      if (avgError) throw avgError;

      // Get review count using the database function
      const { data: countData, error: countError } = await supabase
        .rpc('get_review_count', { user_profile_id: userId });

      if (countError) throw countError;

      setAverageRating(avgData || 0);
      setTotalReviews(countData || 0);
    } catch (error: any) {
      console.error('Error fetching review stats:', error);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span>Reviews & Ratings</span>
            </CardTitle>
            <CardDescription>
              What others are saying about their experience
            </CardDescription>
          </div>
          
          {totalReviews > 0 && (
            <div className="text-center">
              <div className="flex items-center space-x-1">
                {renderStars(Math.round(averageRating), 'lg')}
                <span className="text-lg font-bold ml-2">{averageRating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground">
              This user hasn't received any reviews yet.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {reviews.map((review) => (
                 <div key={review.id} className="border rounded-lg p-3 md:p-4 bg-muted/20">
                   <div className="flex flex-col sm:flex-row items-start space-y-3 sm:space-y-0 sm:space-x-3">
                     <Avatar className="w-10 h-10 mx-auto sm:mx-0">
                       <AvatarImage src={review.reviewer_profile?.profile_photo_url || ''} />
                       <AvatarFallback>
                         {review.reviewer_profile?.full_name?.charAt(0).toUpperCase()}
                       </AvatarFallback>
                     </Avatar>
                     
                     <div className="flex-1 w-full">
                       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-2 space-y-2 lg:space-y-0">
                         <div className="text-center sm:text-left">
                           <p className="font-medium text-sm md:text-base">
                             {review.reviewer_profile?.full_name}
                           </p>
                           {review.reviewer_profile?.company_name && (
                             <p className="text-xs md:text-sm text-muted-foreground">
                               {review.reviewer_profile.company_name}
                             </p>
                           )}
                           <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                             <Badge 
                               variant={review.reviewer_profile?.role === 'employer' ? 'default' : 'secondary'}
                               className="text-xs"
                             >
                               {review.reviewer_profile?.role}
                             </Badge>
                             {review.job?.title && (
                               <Badge variant="outline" className="text-xs">
                                 <Briefcase className="w-3 h-3 mr-1" />
                                 {review.job.title}
                               </Badge>
                             )}
                           </div>
                         </div>
                         
                         <div className="text-center lg:text-right">
                           <div className="flex justify-center lg:justify-end">
                             {renderStars(review.rating)}
                           </div>
                           <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center lg:justify-end">
                             <Calendar className="w-3 h-3 mr-1" />
                             {formatDate(review.created_at)}
                           </p>
                         </div>
                       </div>
                       
                       {review.review_text && (
                         <div className="mt-3">
                           <p className="text-sm md:text-base text-muted-foreground bg-background p-3 rounded border">
                             "{review.review_text}"
                           </p>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};