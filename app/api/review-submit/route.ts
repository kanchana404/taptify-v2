import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { reviews, reviewLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Extract the review data from the request
    const body = await req.json();
    
    // Validate required fields
    const requiredFields = {
      review_link_url: body.review_link_url,
      name: body.name,
      stars: body.stars,
      feedback: body.feedback,
      review_type: body.review_type,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Validate review_type is either 'positive' or 'negative'
    if (body.review_type !== 'positive' && body.review_type !== 'negative') {
      return NextResponse.json(
        { error: "review_type must be 'positive' or 'negative'" },
        { status: 400 }
      );
    }

    // Fetch the user_id from the reviewLinks table using the review_link_url
    const reviewLinkData = await db
      .select({ user_id: reviewLinks.user_id })
      .from(reviewLinks)
      .where(eq(reviewLinks.review_link_url, body.review_link_url))
      .limit(1);

    if (!reviewLinkData.length) {
      return NextResponse.json(
        { error: "Review link not found" },
        { status: 404 }
      );
    }

    const userId = reviewLinkData[0].user_id;

    // Insert the review into the database with the retrieved user_id
    const result = await db.insert(reviews).values({
      user_id: userId,
      name: body.name,
      email: body.email,
      phone: body.phone || null, // Phone is optional
      stars: body.stars,
      feedback: body.feedback,
      review_type: body.review_type,
    }).returning({ id: reviews.id });
    
    // Return success response with the new review ID
    return NextResponse.json({
      success: true,
      message: "Review submitted successfully",
      review_id: result[0].id
    });
    
  } catch (error) {
    console.error("Error submitting review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 }
    );
  }
}