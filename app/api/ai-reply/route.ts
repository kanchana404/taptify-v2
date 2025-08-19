import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import OpenAI from 'openai';

// Helper function to validate review ID (supports both string and number IDs)
function validateReviewId(reviewId: any): string | null {
  if (!reviewId) {
    return null;
  }
  
  // Convert to string and trim whitespace
  const reviewIdStr = String(reviewId).trim();
  
  // Check if it's a valid non-empty string
  if (reviewIdStr.length === 0) {
    return null;
  }
  
  return reviewIdStr;
}

// Generate AI reply using OpenAI based on type (short, medium, or long)
async function generateAIReply(
  reviewContent: string,
  rating: number,
  replyType: string = "short"
) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key not configured");
    }

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create context for AI based on rating
    let context = "";
    if (rating >= 4) {
      context =
        "This is a positive review. The customer is satisfied with our service.";
    } else if (rating >= 3) {
      context =
        "This is a neutral review. The customer had an okay experience but there's room for improvement.";
    } else {
      context =
        "This is a negative review. The customer had a poor experience with our service.";
    }

    // Adjust instructions based on reply type
    let lengthInstruction = "";
    let maxTokens = 150;

    if (replyType === "short") {
      lengthInstruction = "Keep your response very concise (2-3 sentences)";
      maxTokens = 100;
    } else if (replyType === "medium") {
      lengthInstruction = "Provide a moderate length response (4-5 sentences)";
      maxTokens = 200;
    } else if (replyType === "long") {
      lengthInstruction =
        "Write a detailed response (6-8 sentences) that thoroughly addresses all points";
      maxTokens = 300;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional and empathetic customer service representative. Your task is to write a thoughtful, personalized response to a customer review. ${lengthInstruction}, professional, and genuinely address the customer's feedback. If the review is negative, acknowledge their concerns and explain how you'll address them. If positive, express gratitude. Don't use generic templates - make each response feel personal.`,
        },
        {
          role: "user",
          content: `${context}\n\nCustomer Review: "${reviewContent}"\n\nPlease write a ${replyType} response to this review.`,
        },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return (
      completion.choices[0].message.content?.trim() ||
      "Thank you for your feedback. We appreciate you taking the time to share your experience with us."
    );
  } catch (error) {
    console.error("Error generating AI reply:", error);
    return "Thank you for your feedback. We appreciate you taking the time to share your experience with us.";
  }
}

// Function to get review data from Google Business API
async function getGoogleReview(reviewId: string, locationName: string, accountName: string) {
  try {
            const response = await fetch(`${process.env.NEXTAUTH_URL || 'https://voice.taptify.com'}/api/business?type=review&reviewId=${encodeURIComponent(reviewId)}&locationName=${encodeURIComponent(locationName)}&accountName=${encodeURIComponent(accountName)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch review from Google Business API');
    }
    
    const data = await response.json();
    return data.review;
  } catch (error) {
    console.error('Error fetching Google review:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  console.log("POST /api/ai-reply endpoint called");
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      console.log("Authentication failed: No userId found");
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log("User authenticated:", userId);

    const { reviewId, locationName, accountName, replyType, customReply, reviewText, reviewRating, reviewAuthor, businessInfo } = await req.json();

    // Validate review ID
    const validReviewId = validateReviewId(reviewId);
    if (!validReviewId) {
      console.log("Invalid review ID provided:", reviewId);
      return NextResponse.json(
        { error: "Valid review ID is required" },
        { status: 400 }
      );
    }

    // Validate replyType
    const validReplyTypes = ["short", "medium", "long"];
    if (!validReplyTypes.includes(replyType)) {
      console.log("Invalid reply type:", replyType);
      return NextResponse.json(
        { error: "Invalid reply type. Must be one of: short, medium, long" },
        { status: 400 }
      );
    }

    let reviewData = null;

    // If review content and rating are provided directly, use them
    if (reviewText && reviewRating !== undefined) {
      reviewData = {
        comment: reviewText,
        starRating: reviewRating
      };
    } 
    // Otherwise, try to fetch from Google Business API
    else if (locationName && accountName) {
      reviewData = await getGoogleReview(validReviewId, locationName, accountName);
    }

    if (!reviewData) {
      console.log("Could not retrieve review data for ID:", validReviewId);
      return NextResponse.json({ error: "Review not found or insufficient data provided" }, { status: 404 });
    }

    // Extract rating value
    const reviewRatingValue = typeof reviewData.starRating === 'string' 
      ? getRatingValue(reviewData.starRating) 
      : reviewData.starRating || 5;

    // Generate AI reply with specified type
    const aiReply = await generateAIReply(
      reviewData.comment || reviewText,
      reviewRatingValue,
      replyType
    );

    console.log("AI reply generated for review ID:", validReviewId);
    return NextResponse.json({ reply: aiReply });
  } catch (error) {
    console.error("Error in AI reply API:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Function to convert starRating string to number (for Google Business reviews)
function getRatingValue(starRating: string): number {
  switch (starRating.toUpperCase()) {
    case 'ONE': return 1;
    case 'TWO': return 2;
    case 'THREE': return 3;
    case 'FOUR': return 4;
    case 'FIVE': return 5;
    default: return 0;
  }
}

// Keep the existing GET, PUT, and DELETE methods for local database reviews
export async function GET(req: NextRequest) {
  console.log("GET /api/ai-reply endpoint called");
  try {
    // Verify authentication
    const { userId } = getAuth(req);
    if (!userId) {
      console.log("Authentication failed: No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", userId);

    // This endpoint is for local database reviews only
    // Google Business reviews are fetched directly via the /api/business endpoint
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  console.log("PUT /api/ai-reply endpoint called");
  try {
    // Verify authentication
    const { userId } = getAuth(req);
    if (!userId) {
      console.log("Authentication failed: No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", userId);

    // Parse request body
    const { reviewId, reply, locationName, accountName } = await req.json();

    // Validate review ID
    const validReviewId = validateReviewId(reviewId);
    if (!validReviewId || reply === undefined) {
      console.log("Invalid review ID or reply not provided:", { reviewId, reply });
      return NextResponse.json(
        { error: "Valid review ID and reply are required" },
        { status: 400 }
      );
    }

    // For Google Business reviews, we need to submit the reply via the Business API
    if (locationName && accountName) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'https://voice.taptify.com'}/api/business`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'reply',
            reviewId: validReviewId,
            locationName,
            accountName,
            comment: reply,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit reply to Google Business');
        }

        console.log("Reply submitted to Google Business for review ID:", validReviewId);
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("Error submitting reply to Google Business:", error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to submit reply" },
          { status: 500 }
        );
      }
    }

    // If no location/account provided, this might be a local database review
    // But since we don't have the database operations for string IDs, return an error
    return NextResponse.json(
      { error: "Location and account information required for Google Business reviews" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  console.log("DELETE /api/ai-reply endpoint called");
  try {
    // Verify authentication
    const { userId } = getAuth(req);
    if (!userId) {
      console.log("Authentication failed: No userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("User authenticated:", userId);

    // Parse query parameters
    const url = new URL(req.url);
    const reviewIdParam = url.searchParams.get('reviewId');

    // Validate review ID
    const validReviewId = validateReviewId(reviewIdParam);
    if (!validReviewId) {
      console.log("Invalid review ID provided:", reviewIdParam);
      return NextResponse.json(
        { error: "Valid review ID is required" },
        { status: 400 }
      );
    }

    // For Google Business reviews, deletion might not be supported
    // This would depend on the Google Business API capabilities
    console.log("Delete operation requested for Google review ID:", validReviewId);
    return NextResponse.json(
      { error: "Delete operation not supported for Google Business reviews" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}