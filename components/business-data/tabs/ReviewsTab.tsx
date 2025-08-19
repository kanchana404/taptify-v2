import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Star,
  TrendingUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { calculateAverageRating, formatNumber } from '../utils';

interface ReviewsTabProps {
  reviews: any[];
}

const ReviewsTab: React.FC<ReviewsTabProps> = ({ reviews }) => {
  const router = useRouter();
  
  const averageRating = calculateAverageRating(reviews);
  const recentReviews = reviews.slice(0, 5);

  const getRatingStars = (rating: string) => {
    const numStars = {
      'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5
    }[rating] || 0;
    
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < numStars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const ratingDistribution = reviews.reduce((acc, review) => {
    const rating = review.starRating;
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Customer Reviews</h3>
          <p className="text-muted-foreground">Monitor and respond to customer feedback</p>
        </div>
        <Button onClick={() => router.push('/review-management')}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Manage All Reviews
        </Button>
      </div>

      {reviews.length > 0 ? (
        <>
          {/* Review Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold">{formatNumber(reviews.length)}</div>
                    <div className="text-sm text-muted-foreground">Total Reviews</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold">89%</div>
                    <div className="text-sm text-muted-foreground">Response Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div>
                    <div className="text-2xl font-bold">2h</div>
                    <div className="text-sm text-muted-foreground">Avg Response Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rating Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {['FIVE', 'FOUR', 'THREE', 'TWO', 'ONE'].map((rating, index) => {
                  const count = ratingDistribution[rating] || 0;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  const stars = 5 - index;
                  
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-12">
                        <span className="text-sm">{stars}</span>
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className={`bg-yellow-400 h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground w-12 text-right">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentReviews.map((review, index) => (
                  <div key={index} className="flex gap-3 pb-4 border-b last:border-b-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                        {review.reviewer?.profilePhotoUrl ? (
                          <img
                            src={review.reviewer.profilePhotoUrl}
                            alt={review.reviewer.displayName || 'Reviewer'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <MessageCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex">
                          {getRatingStars(review.starRating)}
                        </div>
                        <span className="text-sm font-medium">
                          {review.reviewer?.displayName || 'Anonymous User'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {review.createTime ? new Date(review.createTime).toLocaleDateString() : 'Unknown date'}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm leading-relaxed mb-2">{review.comment}</p>
                      )}
                      {review.reviewReply && (
                        <div className="bg-muted/50 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">Business Response</Badge>
                          </div>
                          <p className="text-sm">{review.reviewReply.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12">
          <MessageCircle className="inline-block h-12 w-12 opacity-20" />
          <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
          <p className="text-muted-foreground">
            Encourage customers to leave reviews to build your reputation
          </p>
          <Button className="mt-4" variant="outline" onClick={() => toast.info('Review link copied')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Get Review Link
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReviewsTab;
