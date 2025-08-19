import { NextRequest, NextResponse } from 'next/server';
import db from '@/db/drizzle';
import { scheduledQna } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

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

// POST: Schedule new QnA (single or batch, all for the same date)
export async function POST(req: NextRequest) {
  const data = await req.json();
  // data: { user_id, qna: [{question, answer}], scheduled_publish_time, batch_id, location_id?: string }
  const { user_id, qna, scheduled_publish_time, batch_id, location_id } = data;
  if (!user_id || !Array.isArray(qna) || qna.length === 0 || !scheduled_publish_time) {
    return NextResponse.json({ error: 'Missing user_id, qna, or scheduled_publish_time' }, { status: 400 });
  }
  
  try {
    // Parse and validate the scheduled publish time
    const scheduledDate = parseScheduledDate(scheduled_publish_time);
    const formattedDate = formatDateForDatabase(scheduledDate);
    
    console.log(`Processing QnA batch for user: ${user_id}`);
    console.log(`Original date: ${scheduled_publish_time}`);
    console.log(`Parsed date: ${scheduledDate.toISOString()}`);
    console.log(`Formatted date: ${formattedDate.toISOString()}`);
    console.log(`Location ID: ${location_id || 'Not specified'}`);
    
    const toInsert = qna.map(item => ({
      user_id,
      location_id: location_id || item.location_id || null, // Add location_id to the database insert
      account_name: item.account_name || null, // Add account_name to the database insert
      question: item.question,
      answer: item.answer || '',
      scheduled_publish_time: formattedDate,
      status: 'scheduled',
      published_at: null,
      batch_id: batch_id || null,
      created_at: new Date(),
      updated_at: new Date(),
    }));
    
    const result = await db.insert(scheduledQna).values(toInsert).returning();
    
    // Log the saved QnA for verification
    console.log(`Successfully saved ${result.length} QnA items:`);
    result.forEach((item, index) => {
      console.log(`QnA ${index + 1}: ID=${item.id}, Location=${(item as any).location_id}, Scheduled=${item.scheduled_publish_time}, Question=${item.question?.substring(0, 30)}...`);
    });
    
    return NextResponse.json({ success: true, qna: result });
  } catch (e) {
    const message = (typeof e === 'object' && e && 'message' in e) ? (e as any).message : String(e);
    console.error('Error saving scheduled QnA:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: List scheduled QnA for a user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
  }
  
  try {
    const qna = await db.select().from(scheduledQna).where(eq(scheduledQna.user_id, user_id));
    
    // Format the QnA to ensure proper date handling
    const formattedQna = qna.map(item => ({
      ...item,
      scheduled_publish_time: item.scheduled_publish_time ? new Date(item.scheduled_publish_time).toISOString() : null,
      published_at: item.published_at ? new Date(item.published_at).toISOString() : null,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null,
    }));
    
    console.log('GET scheduled QnA for user:', user_id, 'Count:', formattedQna.length);
    console.log('QnA IDs:', formattedQna.map(q => q.id));
    console.log('Scheduled dates:', formattedQna.map(q => ({ id: q.id, scheduled: q.scheduled_publish_time })));
    
    return NextResponse.json({ qna: formattedQna });
  } catch (e) {
    const message = (typeof e === 'object' && e && 'message' in e) ? (e as any).message : String(e);
    console.error('Error retrieving scheduled QnA:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH: Update or delete scheduled QnA
export async function PATCH(req: NextRequest) {
  const data = await req.json();
  // data: { user_id, qna_ids, updates }
  const { user_id, qna_ids, updates } = data;
  if (!user_id || !Array.isArray(qna_ids) || qna_ids.length === 0 || !updates) {
    return NextResponse.json({ error: 'Missing user_id, qna_ids, or updates' }, { status: 400 });
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
    
    const result = await db.update(scheduledQna)
      .set(processedUpdates)
      .where(and(eq(scheduledQna.user_id, user_id), inArray(scheduledQna.id, qna_ids)))
      .returning();
    
    // Format the response dates
    const formattedResult = result.map(item => ({
      ...item,
      scheduled_publish_time: item.scheduled_publish_time ? new Date(item.scheduled_publish_time).toISOString() : null,
      published_at: item.published_at ? new Date(item.published_at).toISOString() : null,
      created_at: item.created_at ? new Date(item.created_at).toISOString() : null,
      updated_at: item.updated_at ? new Date(item.updated_at).toISOString() : null,
    }));
    
    return NextResponse.json({ success: true, qna: formattedResult });
  } catch (e) {
    const message = (typeof e === 'object' && e && 'message' in e) ? (e as any).message : String(e);
    console.error('Error updating scheduled QnA:', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 