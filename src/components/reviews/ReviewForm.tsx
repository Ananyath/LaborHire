import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Star, StarOff } from 'lucide-react';

interface ReviewFormProps {
  revieweeId: string;
  revieweeName: string;
  jobId?: string;
  jobTitle?: string;
  onReviewSubmitted?: () => void;
  children?: React.ReactNode;
}

export const ReviewForm = ({ 
  revieweeId, 
  revieweeName, 
  jobId, 
  jobTitle, 
  onReviewSubmitted,
  children 
}: ReviewFormProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (!profile?.id || !rating) {
      toast({
        title: 'Error',
        description: 'Please select a rating.',
        variant: 'destructive',
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      toast({
        title: 'Error',
        description: 'Rating must be between 1 and 5 stars.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: profile.id,
          reviewee_id: revieweeId,
          job_id: jobId || null,
          rating,
          review_text: reviewText.trim() || null
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: 'Review Already Exists',
            description: 'You have already reviewed this person for this job.',
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      toast({
        title: 'Review Submitted',
        description: 'Your review has been submitted successfully.',
      });

      // Reset form
      setRating(0);
      setReviewText('');
      setIsOpen(false);
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Star className="w-4 h-4 mr-2" />
            Leave Review
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Share your experience working with {revieweeName}
            {jobTitle && ` on "${jobTitle}"`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Star Rating */}
          <div>
            <label className="text-sm font-medium mb-2 block">Rating</label>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  {(hoveredRating || rating) >= star ? (
                    <Star className="w-8 h-8 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {rating === 0 && 'Select a rating'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Review (Optional)
            </label>
            <Textarea
              placeholder="Share details about your experience..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={!rating || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};