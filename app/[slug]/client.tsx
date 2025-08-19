"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ReviewLinkData {
  business_name: string;
  review_title: string;
  star_filter_enabled: boolean;
  star_threshold: number;
  show_powered_by: boolean;
  header_image_url: string | null;
  preview_icon_url: string | null;
  positive_feedback_text: string | null;
  negative_feedback_text: string | null;
  google_review_link: string | null;
  user_id: string;
  review_link_url: string;
}

interface ReviewPageClientProps {
  initialData: ReviewLinkData | null;
  error: string | null;
}

export function ReviewPageClient({ initialData, error }: ReviewPageClientProps) {
  const [data] = useState<ReviewLinkData | null>(initialData);
  const [starRating, setStarRating] = useState(0);
  const [originalRating, setOriginalRating] = useState(0); // Store the original 1-5 rating
  const [step, setStep] = useState("rating"); // rating, positive, negative
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");
  
  // Function to handle star rating selection
  const handleStarClick = (rating: number) => {
    // Convert 5-star scale to 10-point scale
    const scaledRating = rating * 2;
    setStarRating(scaledRating);
    setOriginalRating(rating); // Store the original 1-5 rating
    
    console.log("Star clicked:", rating);
    console.log("Threshold from DB:", data?.star_threshold);
    console.log("Star filter enabled:", data?.star_filter_enabled);
    
    // If star filter protection is enabled
    if (data?.star_filter_enabled) {
      // Check if rating is less than or equal to the threshold from database
      // If threshold is 3 and user clicks 3, show form (negative feedback)
      // If threshold is 3 and user clicks 4, go to Google review (positive feedback)
      if (rating <= data.star_threshold) {
        console.log("Rating <= threshold, showing feedback form");
        setStep("negative");
      } else {
        console.log("Rating > threshold, redirecting to Google");
        // For ratings above threshold, go directly to Google
        handlePositiveSubmit();
      }
    } else {
      console.log("Star filter disabled, redirecting to Google");
      // If star filtering is disabled, open Google review directly
      handlePositiveSubmit();
    }
  };
  
  // Function to handle positive experience submit - redirect to Google review
  const handlePositiveSubmit = () => {
    // Use the Google review link from the data if it exists
    if (data?.google_review_link && data.google_review_link.trim() !== "") {
      // Ensure URL has proper formatting
      let reviewUrl = data.google_review_link;
      if (!reviewUrl.startsWith('http://') && !reviewUrl.startsWith('https://')) {
        reviewUrl = 'https://' + reviewUrl;
      }
      
      // Open the review link
      window.location.href = reviewUrl;
    } else {
      // Fallback to generating a Google search URL if no custom link exists
      const businessName = encodeURIComponent(data?.business_name || "");
      window.location.href = `https://www.google.com/search?q=${businessName}+review`;
    }
  };
  
  // Function to submit positive feedback to our system
  const handlePositiveFeedbackSubmit = async () => {
    if (!feedback.trim()) {
      alert("Please provide some feedback before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Send positive feedback to the review-submit API
      const response = await fetch('/api/review-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_link_url: data?.review_link_url,
          name: name || "Anonymous",
          email,
          phone,
          stars: starRating,
          feedback,
          review_type: 'positive',
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }
      
      // Show success
      setSubmitSuccess(true);
      
      // Redirect to Google after a short delay
      setTimeout(() => {
        handlePositiveSubmit();
      }, 2000);
      
    } catch (err: any) {
      console.error("Error submitting positive feedback:", err);
      setSubmitError(err.message || "There was an error submitting your feedback. Please try again.");
      // Still redirect to Google after delay even if our system submit fails
      setTimeout(() => {
        handlePositiveSubmit();
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Function to handle negative experience submit
  const handleNegativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Send feedback to your review-submit API
      const response = await fetch('/api/review-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          review_link_url: data?.review_link_url,
          name,
          email,
          phone,
          stars: starRating,
          feedback,
          review_type: 'negative',
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }
      
      // Show success
      setSubmitSuccess(true);
      
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setFeedback("");
      
    } catch (err: any) {
      console.error("Error submitting feedback:", err);
      setSubmitError(err.message || "There was an error submitting your feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Error state
  if (error || !data) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-medium mb-2">Error</h2>
          <p className="text-muted-foreground">{error || "Failed to load review page"}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col md:flex-row">
      {/* Left side - Review form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto py-6">
          {/* Business logo/icon */}
          <div className="flex flex-col items-center mb-8">
            {data.preview_icon_url ? (
              <div className="w-32 h-32 sm:w-40 sm:h-40 relative">
                <img 
                  src={data.preview_icon_url}
                  alt={data.business_name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-red-600 flex items-center justify-center rounded-lg">
                <span className="text-white text-xl sm:text-2xl font-bold">{data.business_name}</span>
              </div>
            )}
          </div>
          
          {step === "rating" && (
            <div className="flex flex-col items-center space-y-8">
              <h1 className="text-xl sm:text-2xl font-medium text-center text-gray-800 px-2">
                {data.review_title || `How was your experience with ${data.business_name}?`}
              </h1>
              
                             {/* Star rating */}
               <div className="flex space-x-2 sm:space-x-3">
                 {[1, 2, 3, 4, 5].map((star) => (
                   <Star
                     key={star}
                     className={`w-8 h-8 sm:w-10 sm:h-10 ${
                       star <= originalRating
                         ? "text-yellow-400 fill-yellow-400"
                         : "text-gray-300"
                     } cursor-pointer`}
                     onClick={() => handleStarClick(star)}
                   />
                 ))}
               </div>
            </div>
          )}
          
          {step === "positive" && !submitSuccess && (
            <div className="flex flex-col items-center space-y-8 px-4">
              <p className="text-lg text-center">
                {data.positive_feedback_text || "Leave us a review, it will help us grow and better serve our customers like you."}
              </p>
              
                             {/* Show star rating feedback */}
               <div className="flex space-x-2">
                 {[1, 2, 3, 4, 5].map((star) => (
                   <Star
                     key={star}
                     className={`w-6 h-6 ${
                       star <= originalRating
                         ? "text-yellow-400 fill-yellow-400"
                         : "text-gray-300"
                     }`}
                   />
                 ))}
               </div>
              
              <Button 
                onClick={handlePositiveSubmit}
                className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white"
              >
                Leave a Review
              </Button>
            </div>
          )}
          
          {step === "positive" && submitSuccess && (
            <div className="flex flex-col items-center space-y-6 bg-green-50 p-6 rounded-lg border border-green-200 mx-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              
              <h2 className="text-xl font-medium text-green-800">Thank you!</h2>
              <p className="text-center text-green-700">
                Redirecting you to Google to leave your review...
              </p>
            </div>
          )}
          
          {step === "negative" && !submitSuccess && (
            <div className="flex flex-col items-center space-y-6 px-4">
              <p className="text-lg text-center">
                {data.negative_feedback_text || "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service."}
              </p>
              
              <form onSubmit={handleNegativeSubmit} className="w-full space-y-4">
                <Input 
                  placeholder="Your name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input 
                    placeholder="Your email" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Input 
                    placeholder="Phone number (optional)" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                
                <Textarea 
                  placeholder="Your feedback"
                  className="min-h-[120px]"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  required
                />
                
                {submitError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md text-sm">
                    {submitError}
                  </div>
                )}
                
                <Button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Sending..." : "Send Feedback"}
                </Button>
              </form>
            </div>
          )}
          
          {step === "negative" && submitSuccess && (
            <div className="flex flex-col items-center space-y-6 bg-green-50 p-6 rounded-lg border border-green-200 mx-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              
              <h2 className="text-xl font-medium text-green-800">Thank you for your feedback!</h2>
              <p className="text-center text-green-700">
                We appreciate you taking the time to share your experience. We'll use your feedback to improve our service.
              </p>
            </div>
          )}
          
          {/* Powered by footer */}
          {data.show_powered_by && (
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Powered by <span className="font-medium">Taptify</span>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Right side - Image (hidden on mobile) */}
      <div className="hidden md:block md:w-1/2 lg:w-3/5 relative">
        {data.header_image_url ? (
          <div className="h-full w-full">
            <img
              src={data.header_image_url}
              alt="Review background"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center max-w-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Thank you for your feedback!</h2>
              <p className="text-gray-600">
                Your opinion helps us improve our service. We appreciate you taking the time to share your experience.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}