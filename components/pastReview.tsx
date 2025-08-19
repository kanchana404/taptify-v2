"use client";

import { useState, useEffect } from "react";
import { Star, Calendar, ArrowRight, ThumbsUp, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

// Interface for review data
interface Review {
  id: string;
  customerName: string;
  customerEmail: string;
  customerAvatar: string;
  reviewDate: string;
  rating: number;
  sentiment: string;
  comment: string;
  isReplied: boolean;
  replyDate: string | null;
  reply: string;
  isAiGenerated: boolean;
  phone: string;
}

// Function to render stars based on rating
const RatingStars = ({ rating }: { rating: number }) => {
  const starsArray = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      starsArray.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      );
    } else if (i === fullStars && hasHalfStar) {
      starsArray.push(
        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400 opacity-50" />
      );
    } else {
      starsArray.push(
        <Star key={i} className="h-4 w-4 text-muted-foreground" />
      );
    }
  }

  return <div className="flex">{starsArray}</div>;
};

export function PastReview() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [formattedDates, setFormattedDates] = useState<{ [key: string]: string }>({});

  // Fetch reviews from API
  useEffect(() => {
    async function fetchReviews() {
      try {
        // Using the same API endpoint as the review management page
        const response = await fetch('/api/ai-reply?limit=5');
        if (!response.ok) {
          throw new Error('Failed to fetch reviews');
        }
        const data = await response.json();
        
        // Sort reviews by date (newest first)
        const sortedReviews = data.sort((a: Review, b: Review) => 
          new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime()
        );
        
        // Get only the latest 5 reviews
        const latestReviews = sortedReviews.slice(0, 5);
        
        setReviews(latestReviews);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setLoading(false);
      }
    }

    fetchReviews();
  }, []);

  // Format dates on the client side after reviews are loaded
  useEffect(() => {
    if (reviews.length === 0) return;

    const newFormattedDates: { [key: string]: string } = {};

    reviews.forEach(review => {
      newFormattedDates[review.id] = format(new Date(review.reviewDate), 'MMM d, yyyy');
    });

    setFormattedDates(newFormattedDates);
  }, [reviews]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Recent Reviews</CardTitle>
          <CardDescription>Last 5 customer reviews</CardDescription>
        </div>
        <Link 
          href="/review-management" 
          className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-500 transition-colors"
        >
          View All
          <ArrowRight className="h-3 w-3 text-purple-600" />
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading ? (
            // Loading skeletons
            Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                <Avatar className="h-10 w-10 border border-purple-100 dark:border-purple-800">
                  <AvatarImage src={review.customerAvatar} alt={review.customerName} />
                  <AvatarFallback className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                    {review.customerName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{review.customerName}</p>
                    <Badge
                      variant="outline"
                      className={`${
                        review.sentiment === 'positive'
                          ? 'text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                          : 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                      }`}
                    >
                      {review.sentiment === 'positive' ? (
                        <div className="flex items-center">
                          <ThumbsUp className="mr-1 h-3 w-3" />
                          <span>Positive</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <ThumbsDown className="mr-1 h-3 w-3" />
                          <span>Negative</span>
                        </div>
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingStars rating={review.rating} />
                    <span className="text-sm text-muted-foreground">
                      {review.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{review.comment}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formattedDates[review.id] || review.reviewDate}
                    </div>
                    {review.isReplied ? (
                      <Badge variant="secondary" className="text-xs">Replied</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-orange-500 border-orange-200">Pending</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No reviews found</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Showing {reviews.length} of {reviews.length} recent reviews
        </div>
      </CardFooter>
    </Card>
  );
}