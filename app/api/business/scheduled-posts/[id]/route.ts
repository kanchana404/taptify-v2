import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/drizzle';
import { scheduledPosts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// Helper function to parse and validate date (same as main route)
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

// Helper function to format date for database storage (same as main route)
function formatDateForDatabase(date: Date): Date {
  // Ensure the date is properly formatted for database storage
  // This ensures timezone consistency
  const utcDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  return utcDate;
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const postId = Number(id);
  
  if (!postId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  try {
    console.log('DELETE request for post ID:', postId, 'User ID:', userId);
    
    // First, let's check what posts exist for this user
    const userPosts = await db.select().from(scheduledPosts).where(eq(scheduledPosts.user_id, userId));
    console.log('User posts count:', userPosts.length);
    console.log('User post IDs:', userPosts.map(p => p.id));
    
    // Check if this specific post exists at all
    const postExists = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, postId));
    console.log('Post with ID', postId, 'exists:', postExists.length > 0);
    if (postExists.length > 0) {
      console.log('Post belongs to user:', postExists[0].user_id);
    }
    
    // Try to delete the post directly
    const result = await db.delete(scheduledPosts).where(
      and(eq(scheduledPosts.id, postId), eq(scheduledPosts.user_id, userId))
    );
    
    console.log('Delete result rowCount:', result.rowCount);
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Post not found or access denied' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting scheduled post:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const postId = Number(id);
  if (!postId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
  const updates = await req.json();
  
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
    
    const result = await db.update(scheduledPosts).set(processedUpdates).where(
      and(eq(scheduledPosts.id, postId), eq(scheduledPosts.user_id, userId))
    );
    
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error updating scheduled post:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}