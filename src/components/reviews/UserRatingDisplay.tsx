import { useState, useEffect } from 'react';
import { StarRating } from './StarRating';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface UserRatingDisplayProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showReviewCount?: boolean;
  className?: string;
}

export const UserRatingDisplay = ({ 
  userId, 
  size = 'md', 
  showReviewCount = true, 
  className = '' 
}: UserRatingDisplayProps) => {
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchRatingData();
    }
  }, [userId]);

  const fetchRatingData = async () => {
    try {
      // Get average rating
      const { data: avgData, error: avgError } = await supabase
        .rpc('calculate_average_rating', { user_profile_id: userId });

      if (avgError) throw avgError;

      // Get review count
      const { data: countData, error: countError } = await supabase
        .rpc('get_review_count', { user_profile_id: userId });

      if (countError) throw countError;

      setAverageRating(avgData || 0);
      setReviewCount(countData || 0);
    } catch (error: any) {
      console.error('Error fetching rating data:', error);
      setAverageRating(0);
      setReviewCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    );
  }

  if (reviewCount === 0) {
    return (
      <div className={className}>
        <Badge variant="secondary" className="text-xs">
          No reviews yet
        </Badge>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <StarRating rating={averageRating} size={size} showValue={true} />
      {showReviewCount && (
        <span className={`text-muted-foreground ${
          size === 'sm' ? 'text-xs' : 
          size === 'md' ? 'text-sm' : 'text-base'
        }`}>
          ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  );
};