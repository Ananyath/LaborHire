import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

export const StarRating = ({ 
  rating, 
  size = 'md', 
  showValue = false, 
  className = '' 
}: StarRatingProps) => {
  const [displayRating, setDisplayRating] = useState(0);

  useEffect(() => {
    // Animate the rating display
    const timer = setTimeout(() => {
      setDisplayRating(rating);
    }, 100);

    return () => clearTimeout(timer);
  }, [rating]);

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const starSize = sizeClasses[size];

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} transition-colors duration-200 ${
              star <= displayRating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
      
      {showValue && (
        <span className={`font-medium text-muted-foreground ${
          size === 'sm' ? 'text-xs' : 
          size === 'md' ? 'text-sm' : 'text-base'
        }`}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
};