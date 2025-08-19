import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { link } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { linkId } = await req.json();
    if (!linkId) {
      return NextResponse.json({ error: 'Missing linkId' }, { status: 400 });
    }
    
    // Update link record with clicked status and timestamp
    const now = new Date();
    await db
      .update(link)
      .set({ 
        link_status: 'visit',
        clicked_time: now,
        updated_at: now
      })
      .where(eq(link.link_id, linkId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating link click:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update link status', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}