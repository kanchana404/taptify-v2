import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/drizzle';
import { scheduledPosts } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// Helper function to parse and validate date
function parseScheduledDate(dateInput: any): Date {
  if (!dateInput) {
    return new Date();
  }
  
  // Handle ISO string format
  if (typeof dateInput === 'string') {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Handle Date object
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // Handle timestamp
  if (typeof dateInput === 'number') {
    const date = new Date(dateInput);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Fallback to current date
  return new Date();
}

// Helper function to format date for database storage
function formatDateForDatabase(date: Date): Date {
  // Ensure the date is properly formatted for database storage
  // This ensures timezone consistency
  const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return utcDate;
}

// POST: Schedule new posts (single or batch)
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  // data: { posts: [{...}], location_id?: string }
  const { posts, location_id } = data;
  if (!Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ error: 'Missing posts' }, { status: 400 });
  }
  
  try {
    console.log('Received location_id:', location_id);
    console.log('Number of posts to insert:', posts.length);
    
    const toInsert = posts.map(post => {
      // Parse and validate the scheduled publish time
      const scheduledDate = parseScheduledDate(post.scheduled_publish_time);
      const formattedDate = formatDateForDatabase(scheduledDate);
      
      console.log(`Processing post: ${post.summary?.substring(0, 50)}...`);
      console.log(`Original date: ${post.scheduled_publish_time}`);
      console.log(`Parsed date: ${scheduledDate.toISOString()}`);
      console.log(`Formatted date: ${formattedDate.toISOString()}`);
      console.log(`Location ID: ${location_id || post.location_id || 'Not specified'}`);
      console.log(`Account Name: ${post.account_name || 'Not specified'}`);
      
      // Prepare metadata for different post types
      let metadata = null;
      
      if (post.topic_type === 'EVENT' && post.event) {
        metadata = JSON.stringify({
          type: 'event',
          title: post.event.title,
          description: post.event.description,
          schedule: post.event.schedule,
          location: post.event.location,
          organizer: post.event.organizer,
          category: post.event.category,
          tags: post.event.tags,
          maxAttendees: post.event.maxAttendees,
          registrationRequired: post.event.registrationRequired,
          registrationUrl: post.event.registrationUrl,
          price: post.event.price,
          currency: post.event.currency,
          featured: post.event.featured,
          recurring: post.event.recurring,
          recurringPattern: post.event.recurringPattern,
        });
      } else if (post.topic_type === 'OFFER' && post.offer) {
        metadata = JSON.stringify({
          type: 'offer',
          title: post.offer.title,
          description: post.offer.description,
          schedule: post.offer.schedule,
          couponCode: post.offer.couponCode,
          discountType: post.offer.discountType, // percentage, fixed, buy-one-get-one
          discountValue: post.offer.discountValue,
          minimumPurchase: post.offer.minimumPurchase,
          maximumDiscount: post.offer.maximumDiscount,
          redeemOnlineUrl: post.offer.redeemOnlineUrl,
          termsConditions: post.offer.termsConditions,
          applicableProducts: post.offer.applicableProducts,
          excludedProducts: post.offer.excludedProducts,
          usageLimit: post.offer.usageLimit,
          customerType: post.offer.customerType, // new, existing, all
          featured: post.offer.featured,
        });
      } else if (post.topic_type === 'ALERT' && post.alertType) {
        metadata = JSON.stringify({
          type: 'alert',
          alertType: post.alertType,
          severity: post.alert.severity, // info, warning, critical
          title: post.alert.title,
          description: post.alert.description,
          schedule: post.alert.schedule,
          actionRequired: post.alert.actionRequired,
          actionUrl: post.alert.actionUrl,
          expiresAt: post.alert.expiresAt,
        });
      } else if (post.topic_type === 'PRODUCT' && post.product) {
        metadata = JSON.stringify({
          type: 'product',
          title: post.product.title,
          description: post.product.description,
          price: post.product.price,
          currency: post.product.currency,
          originalPrice: post.product.originalPrice,
          category: post.product.category,
          brand: post.product.brand,
          sku: post.product.sku,
          availability: post.product.availability, // in-stock, out-of-stock, pre-order
          inventory: post.product.inventory,
          features: post.product.features,
          specifications: post.product.specifications,
          images: post.product.images,
          variants: post.product.variants,
          tags: post.product.tags,
          featured: post.product.featured,
        });
      } else if (post.topic_type === 'SERVICE' && post.service) {
        metadata = JSON.stringify({
          type: 'service',
          title: post.service.title,
          description: post.service.description,
          price: post.service.price,
          currency: post.service.currency,
          duration: post.service.duration,
          category: post.service.category,
          provider: post.service.provider,
          availability: post.service.availability,
          bookingRequired: post.service.bookingRequired,
          bookingUrl: post.service.bookingUrl,
          features: post.service.features,
          requirements: post.service.requirements,
          testimonials: post.service.testimonials,
          featured: post.service.featured,
        });
      } else if (post.topic_type === 'ANNOUNCEMENT' && post.announcement) {
        metadata = JSON.stringify({
          type: 'announcement',
          title: post.announcement.title,
          description: post.announcement.description,
          category: post.announcement.category, // news, update, milestone, achievement
          priority: post.announcement.priority, // low, medium, high
          targetAudience: post.announcement.targetAudience,
          expiresAt: post.announcement.expiresAt,
          actionUrl: post.announcement.actionUrl,
          actionText: post.announcement.actionText,
          featured: post.announcement.featured,
        });
      } else if (post.topic_type === 'TESTIMONIAL' && post.testimonial) {
        metadata = JSON.stringify({
          type: 'testimonial',
          customerName: post.testimonial.customerName,
          customerAvatar: post.testimonial.customerAvatar,
          rating: post.testimonial.rating,
          review: post.testimonial.review,
          service: post.testimonial.service,
          date: post.testimonial.date,
          verified: post.testimonial.verified,
          featured: post.testimonial.featured,
        });
      } else if (post.topic_type === 'FAQ' && post.faq) {
        metadata = JSON.stringify({
          type: 'faq',
          question: post.faq.question,
          answer: post.faq.answer,
          category: post.faq.category,
          tags: post.faq.tags,
          helpful: post.faq.helpful,
          featured: post.faq.featured,
        });
      } else if (post.topic_type === 'GALLERY' && post.gallery) {
        metadata = JSON.stringify({
          type: 'gallery',
          title: post.gallery.title,
          description: post.gallery.description,
          images: post.gallery.images,
          category: post.gallery.category,
          tags: post.gallery.tags,
          featured: post.gallery.featured,
        });
      } else if (post.topic_type === 'VIDEO' && post.video) {
        metadata = JSON.stringify({
          type: 'video',
          title: post.video.title,
          description: post.video.description,
          videoUrl: post.video.videoUrl,
          thumbnail: post.video.thumbnail,
          duration: post.video.duration,
          category: post.video.category,
          tags: post.video.tags,
          featured: post.video.featured,
        });
      } else if (post.topic_type === 'BLOG' && post.blog) {
        metadata = JSON.stringify({
          type: 'blog',
          title: post.blog.title,
          excerpt: post.blog.excerpt,
          content: post.blog.content,
          author: post.blog.author,
          category: post.blog.category,
          tags: post.blog.tags,
          readTime: post.blog.readTime,
          featured: post.blog.featured,
        });
      } else if (post.topic_type === 'PODCAST' && post.podcast) {
        metadata = JSON.stringify({
          type: 'podcast',
          title: post.podcast.title,
          description: post.podcast.description,
          audioUrl: post.podcast.audioUrl,
          duration: post.podcast.duration,
          episode: post.podcast.episode,
          season: post.podcast.season,
          guests: post.podcast.guests,
          category: post.podcast.category,
          tags: post.podcast.tags,
          featured: post.podcast.featured,
        });
      } else if (post.topic_type === 'WEBINAR' && post.webinar) {
        metadata = JSON.stringify({
          type: 'webinar',
          title: post.webinar.title,
          description: post.webinar.description,
          schedule: post.webinar.schedule,
          host: post.webinar.host,
          speakers: post.webinar.speakers,
          registrationUrl: post.webinar.registrationUrl,
          maxAttendees: post.webinar.maxAttendees,
          price: post.webinar.price,
          currency: post.webinar.currency,
          category: post.webinar.category,
          tags: post.webinar.tags,
          featured: post.webinar.featured,
        });
      } else if (post.topic_type === 'WORKSHOP' && post.workshop) {
        metadata = JSON.stringify({
          type: 'workshop',
          title: post.workshop.title,
          description: post.workshop.description,
          schedule: post.workshop.schedule,
          instructor: post.workshop.instructor,
          location: post.workshop.location,
          maxParticipants: post.workshop.maxParticipants,
          registrationUrl: post.workshop.registrationUrl,
          price: post.workshop.price,
          currency: post.workshop.currency,
          materials: post.workshop.materials,
          prerequisites: post.workshop.prerequisites,
          category: post.workshop.category,
          tags: post.workshop.tags,
          featured: post.workshop.featured,
        });
      } else if (post.topic_type === 'CONTEST' && post.contest) {
        metadata = JSON.stringify({
          type: 'contest',
          title: post.contest.title,
          description: post.contest.description,
          schedule: post.contest.schedule,
          prizes: post.contest.prizes,
          entryRequirements: post.contest.entryRequirements,
          entryUrl: post.contest.entryUrl,
          maxEntries: post.contest.maxEntries,
          eligibility: post.contest.eligibility,
          rules: post.contest.rules,
          featured: post.contest.featured,
        });
      } else if (post.topic_type === 'GIVEAWAY' && post.giveaway) {
        metadata = JSON.stringify({
          type: 'giveaway',
          title: post.giveaway.title,
          description: post.giveaway.description,
          schedule: post.giveaway.schedule,
          prize: post.giveaway.prize,
          entryMethods: post.giveaway.entryMethods,
          entryUrl: post.giveaway.entryUrl,
          maxEntries: post.giveaway.maxEntries,
          eligibility: post.giveaway.eligibility,
          rules: post.giveaway.rules,
          featured: post.giveaway.featured,
        });
      } else if (post.topic_type === 'STANDARD') {
        // Handle STANDARD posts with basic metadata
        metadata = JSON.stringify({
          type: 'standard',
          title: post.title || null,
          description: post.description || null,
          category: post.category || null,
          tags: post.tags || [],
          featured: post.featured || false,
          author: post.author || null,
          readTime: post.readTime || null,
          targetAudience: post.targetAudience || null,
          callToAction: post.callToAction || null,
          actionUrl: post.actionUrl || null,
          actionText: post.actionText || null,
        });
      }

      return {
        user_id: userId,
        location_id: location_id || post.location_id || null, // Add location_id to the database insert
        account_name: post.account_name || null, // Add account_name to the database insert
        summary: post.summary,
        topic_type: post.topic_type,
        action_type: post.action_type,
        action_url: post.action_url,
        media_url: post.media_url,
        language_code: post.language_code || 'en',
        scheduled_publish_time: formattedDate,
        status: post.status || 'scheduled',
        published_at: post.published_at || null,
        batch_id: post.batch_id || null,
        metadata: metadata, // Add metadata for structured data
        created_at: new Date(),
        updated_at: new Date(),
      };
    });
    
    const result = await db.insert(scheduledPosts).values(toInsert).returning();
    
    // Log the saved posts for verification
    console.log(`Successfully saved ${result.length} posts:`);
    result.forEach((post, index) => {
      console.log(`Post ${index + 1}: ID=${post.id}, Location=${(post as any).location_id}, Scheduled=${post.scheduled_publish_time}, Summary=${post.summary?.substring(0, 30)}...`);
    });
    
    return NextResponse.json({ success: true, posts: result });
  } catch (e) {
    const message = (typeof e === 'object' && e && 'message' in e) ? (e as any).message : String(e);
    console.error('Error saving scheduled posts:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: List scheduled posts for a user
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const posts = await db.select().from(scheduledPosts).where(eq(scheduledPosts.user_id, userId));
    
    // Format the posts to ensure proper date handling
    const formattedPosts = posts.map(post => ({
      ...post,
      scheduled_publish_time: post.scheduled_publish_time ? new Date(post.scheduled_publish_time).toISOString() : null,
      published_at: post.published_at ? new Date(post.published_at).toISOString() : null,
      created_at: post.created_at ? new Date(post.created_at).toISOString() : null,
      updated_at: post.updated_at ? new Date(post.updated_at).toISOString() : null,
    }));
    
    console.log('GET scheduled posts for user:', userId, 'Count:', formattedPosts.length);
    console.log('Post IDs:', formattedPosts.map(p => p.id));
    console.log('Scheduled dates:', formattedPosts.map(p => ({ id: p.id, scheduled: p.scheduled_publish_time })));
    
    return NextResponse.json({ posts: formattedPosts });
  } catch (e) {
    const message = (typeof e === 'object' && e && 'message' in e) ? (e as any).message : String(e);
    console.error('Error retrieving scheduled posts:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update scheduled posts (e.g., mark as published, update content)
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.json();
  // data: { post_ids, updates }
  const { post_ids, updates } = data;
  if (!Array.isArray(post_ids) || post_ids.length === 0 || !updates) {
    return NextResponse.json({ error: 'Missing post_ids or updates' }, { status: 400 });
  }
  
  try {
    // Handle date fields properly
    const processedUpdates = { ...updates };
    
    // If scheduled_publish_time is being updated, format it properly
    if (processedUpdates.scheduled_publish_time) {
      const scheduledDate = parseScheduledDate(processedUpdates.scheduled_publish_time);
      processedUpdates.scheduled_publish_time = formatDateForDatabase(scheduledDate);
    }
    
    // If published_at is being updated, format it properly
    if (processedUpdates.published_at) {
      const publishedDate = parseScheduledDate(processedUpdates.published_at);
      processedUpdates.published_at = formatDateForDatabase(publishedDate);
    }
    
    processedUpdates.updated_at = new Date();
    
    const result = await db.update(scheduledPosts)
      .set(processedUpdates)
      .where(and(eq(scheduledPosts.user_id, userId), inArray(scheduledPosts.id, post_ids)))
      .returning();
    
    // Format the response dates
    const formattedResult = result.map(post => ({
      ...post,
      scheduled_publish_time: post.scheduled_publish_time ? new Date(post.scheduled_publish_time).toISOString() : null,
      published_at: post.published_at ? new Date(post.published_at).toISOString() : null,
      created_at: post.created_at ? new Date(post.created_at).toISOString() : null,
      updated_at: post.updated_at ? new Date(post.updated_at).toISOString() : null,
    }));
    
    return NextResponse.json({ success: true, posts: formattedResult });
  } catch (e) {
    const message = (typeof e === 'object' && e && 'message' in e) ? (e as any).message : String(e);
    console.error('Error updating scheduled posts:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 