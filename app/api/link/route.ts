import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { reviewLinks, users } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    // Get the slug from the request query params
    const searchParams = req.nextUrl.searchParams;
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json(
        { error: "Slug parameter is required" },
        { status: 400 }
      );
    }

    // First, check if the slug matches a user's identifier
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, slug))
      .limit(1);

    let userId: string | null = null;

    if (user.length > 0) {
      // If we found a user with this ID
      userId = user[0].id;
    } else {
      // Try to find a review_link with a custom slug
      // This assumes you might store custom slugs in the review_link_url field
      const reviewLinkBySlug = await db
        .select()
        .from(reviewLinks)
        .where(
          or(
            eq(reviewLinks.review_link_url, `https://beta.taptify.com/${slug}`),
            eq(reviewLinks.review_link_url, `http://go.taptify.com/${slug}`),
            eq(reviewLinks.review_link_url, `go.taptify.com/${slug}`)
          )
        )
        .limit(1);

      if (reviewLinkBySlug.length > 0) {
        userId = reviewLinkBySlug[0].user_id;
      } else {
        // If we still haven't found a match, return 404
        return NextResponse.json(
          { error: "Review link not found" },
          { status: 404 }
        );
      }
    }

    // Now fetch the review link settings for this user
    const reviewLinkSettings = await db
      .select()
      .from(reviewLinks)
      .where(eq(reviewLinks.user_id, userId))
      .limit(1);

    // If no settings exist yet, return default values
    if (!reviewLinkSettings.length) {
      // Try to get the business name from the user if possible
      const businessName = user.length > 0 ? user[0].email.split('@')[0] : slug;
      
      // Create default Google review link
      const googleReviewLink = `https://www.google.com/search?q=${encodeURIComponent(businessName)}+review`;
      
      return NextResponse.json({
        business_name: businessName,
        review_title: `How was your experience with ${businessName}?`,
        star_filter_enabled: true,
        star_threshold: 3,
        show_powered_by: true,
        header_image_url: "",
        preview_icon_url: "",
        positive_feedback_text: "Leave us a review, it will help us grow and better serve our customers like you.",
        negative_feedback_text: "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.",
        google_review_link: googleReviewLink,
      });
    }

    // Get business name to generate Google review link if needed
    const businessName = reviewLinkSettings[0].business_name || user[0]?.email.split('@')[0] || slug;
    
    // Create Google review link if not already set
    let googleReviewLink = reviewLinkSettings[0].google_review_link;
    if (!googleReviewLink) {
      googleReviewLink = `https://www.google.com/search?q=${encodeURIComponent(businessName)}+review`;
    }

    // Return the settings
    return NextResponse.json({
      business_name: businessName,
      review_title: reviewLinkSettings[0].review_title || `How was your experience?`,
      star_filter_enabled: reviewLinkSettings[0].star_filter_enabled,
      star_threshold: reviewLinkSettings[0].star_threshold,
      show_powered_by: reviewLinkSettings[0].show_powered_by,
      header_image_url: reviewLinkSettings[0].header_image_url || "",
      preview_icon_url: reviewLinkSettings[0].preview_icon_url || "",
      positive_feedback_text: reviewLinkSettings[0].positive_feedback_text || "Leave us a review, it will help us grow and better serve our customers like you.",
      negative_feedback_text: reviewLinkSettings[0].negative_feedback_text || "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.",
      google_review_link: googleReviewLink,
    });
  } catch (error) {
    console.error("Error fetching review link:", error);
    return NextResponse.json(
      { error: "Failed to fetch review link data" },
      { status: 500 }
    );
  }
}

// Optional: Implement a POST endpoint to log review submissions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Here you would implement logic to:
    // 1. Save feedback to your database
    // 2. Send notifications to the business owner
    // 3. Log analytics data
    
    // For now, we'll just return a success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing review submission:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}