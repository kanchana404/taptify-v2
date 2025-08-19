import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/drizzle';
import { scheduledQna } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  try {
    await db.delete(scheduledQna).where(eq(scheduledQna.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error deleting scheduled QnA:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const id = Number(context.params.id);
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  
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
    
    const result = await db.update(scheduledQna)
      .set(processedUpdates)
      .where(eq(scheduledQna.id, id))
      .returning();
    
    // Format the response dates
    const formattedResult = result[0] ? {
      ...result[0],
      scheduled_publish_time: result[0].scheduled_publish_time ? new Date(result[0].scheduled_publish_time).toISOString() : null,
      published_at: result[0].published_at ? new Date(result[0].published_at).toISOString() : null,
      created_at: result[0].created_at ? new Date(result[0].created_at).toISOString() : null,
      updated_at: result[0].updated_at ? new Date(result[0].updated_at).toISOString() : null,
    } : null;
    
    return NextResponse.json({ success: true, qna: formattedResult });
  } catch (e) {
    console.error('Error updating scheduled QnA:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
} 