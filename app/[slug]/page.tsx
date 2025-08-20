// This is a Server Component
import db from '@/db/drizzle';
import { reviewLinks, users } from '@/db/schema';
import { eq, or, like } from 'drizzle-orm';
import { ReviewPageClient } from './client';

// Define the interface for the review link data
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

// Helper function to extract slug from URL
function extractSlugFromUrl(url: string): string {
  // Remove protocol and domain
  let slug = url.replace(/^https?:\/\/[^\/]+\//, '');
  // Remove leading slash if present
  slug = slug.replace(/^\//, '');
  // Remove any remaining path segments (keep only the last part)
  slug = slug.split('/').pop() || '';
  return slug;
}

// This is a Server Component that fetches data server-side
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  // Extract the slug from route params - await the params first
  const { slug } = await params;

  // Fetch data server-side
  let data: ReviewLinkData | null = null;
  let error: string | null = null;

  try {
    // First, try to find a review link that contains this slug in the URL
    const reviewLinkBySlug = await db
      .select()
      .from(reviewLinks)
      .where(
        or(
          // Direct slug match (if database stores just slugs)
          eq(reviewLinks.review_link_url, slug),
          // Full URL matches
          eq(reviewLinks.review_link_url, `https://beta.taptify.com/${slug}`),
          eq(reviewLinks.review_link_url, `http://go.taptify.com/${slug}`),
          eq(reviewLinks.review_link_url, `go.taptify.com/${slug}`),
          eq(reviewLinks.review_link_url, `https://beta.taptify.com/${slug}`),
          eq(reviewLinks.review_link_url, `/${slug}`),
          // Partial matches (for current database structure)
          like(reviewLinks.review_link_url, `%/${slug}`),
          like(reviewLinks.review_link_url, `%${slug}`)
        )
      )
      .limit(1);

    let userId: string | null = null;
    let reviewLinkUrl: string | null = null;

    if (reviewLinkBySlug.length > 0) {
      // Found a review link with this slug
      userId = reviewLinkBySlug[0].user_id;
      reviewLinkUrl = reviewLinkBySlug[0].review_link_url;
    } else {
      // If no review link found, check if the slug is a user ID
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, slug))
        .limit(1);

      if (user.length > 0) {
        // Found a user with this ID
        userId = user[0].id;
        reviewLinkUrl = `https://beta.taptify.com/${slug}`;
      }
    }

    if (!userId || !reviewLinkUrl) {
      error = "Review link not found";
    } else {
      // Now fetch the review link settings for this user
      const reviewLinkSettings = await db
        .select()
        .from(reviewLinks)
        .where(eq(reviewLinks.user_id, userId))
        .limit(1);

      // If no settings exist yet, set default values
      if (!reviewLinkSettings.length) {
        // Try to get the business name from the user if possible
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        const businessName = user.length > 0 ? user[0].email.split('@')[0] : slug;
        
        // Create Google review link based on business name
        const googleReviewLink = `https://www.google.com/search?q=${encodeURIComponent(businessName)}+review`;

        data = {
          user_id: userId,
          review_link_url: reviewLinkUrl,
          business_name: businessName,
          review_title: `How was your experience with ${businessName}?`,
          star_filter_enabled: true,
          star_threshold: 3,
          show_powered_by: true,
          header_image_url: null,
          preview_icon_url: null,
          positive_feedback_text: "Leave us a review, it will help us grow and better serve our customers like you.",
          negative_feedback_text: "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.",
          google_review_link: googleReviewLink,
        };
      } else {
        // Use the found settings
        const settings = reviewLinkSettings[0];
        const businessName = settings.business_name || slug;
        
        // Create Google review link if not already set
        let googleReviewLink = settings.google_review_link;
        if (!googleReviewLink) {
          googleReviewLink = `https://www.google.com/search?q=${encodeURIComponent(businessName)}+review`;
        }
        
        data = {
          user_id: userId,
          review_link_url: reviewLinkUrl,
          business_name: businessName,
          review_title: settings.review_title || `How was your experience?`,
          star_filter_enabled: settings.star_filter_enabled,
          star_threshold: settings.star_threshold,
          show_powered_by: settings.show_powered_by,
          header_image_url: settings.header_image_url,
          preview_icon_url: settings.preview_icon_url,
          positive_feedback_text: settings.positive_feedback_text || "Leave us a review, it will help us grow and better serve our customers like you.",
          negative_feedback_text: settings.negative_feedback_text || "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.",
          google_review_link: googleReviewLink,
        };
      }
    }
  } catch (err) {
    console.error("Error fetching review data:", err);
    error = "Failed to load review page";
  }

  // Render the client component with the pre-fetched data
  return <ReviewPageClient initialData={data} error={error} />;
}