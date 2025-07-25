-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id UUID NOT NULL,
  reviewee_id UUID NOT NULL,
  job_id UUID,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reviewer_id, reviewee_id, job_id)
);

-- Enable Row Level Security
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Users can view reviews" 
ON public.reviews 
FOR SELECT 
USING (true); -- Reviews are public

CREATE POLICY "Users can create reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = reviewer_id
  )
);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = reviewer_id
  )
);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (
  auth.uid() IN (
    SELECT profiles.user_id FROM profiles WHERE profiles.id = reviewer_id
  )
);

-- Add indexes for better performance
CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX idx_reviews_reviewer ON public.reviews(reviewer_id);
CREATE INDEX idx_reviews_job ON public.reviews(job_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at);

-- Create function to calculate average rating for a user
CREATE OR REPLACE FUNCTION public.calculate_average_rating(user_profile_id UUID)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  avg_rating DECIMAL(3,2);
BEGIN
  SELECT ROUND(AVG(rating)::numeric, 2) INTO avg_rating
  FROM public.reviews
  WHERE reviewee_id = user_profile_id;
  
  RETURN COALESCE(avg_rating, 0.00);
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get review count for a user
CREATE OR REPLACE FUNCTION public.get_review_count(user_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  review_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO review_count
  FROM public.reviews
  WHERE reviewee_id = user_profile_id;
  
  RETURN COALESCE(review_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add trigger to update profiles table updated_at when review is added
CREATE OR REPLACE FUNCTION public.update_reviewee_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET updated_at = NEW.created_at
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_on_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reviewee_profile_timestamp();

-- Enable realtime for reviews
ALTER TABLE public.reviews REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;