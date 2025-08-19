import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { users, userbase } from '@/db/schema'
import { eq, sql, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    // If user doesn't exist in DB yet, return default data instead of 404
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, returning default rescheduled count`);
      return NextResponse.json({ rescheduledCount: 0 });
    }

    const result = await db
      .select({
        rescheduledCount: sql<number>`COUNT(*)`
      })
      .from(userbase)
      .where(and(sql`recalldate IS NOT NULL`, eq(userbase.user_id, userId)))

    const rescheduledCount = Number(result[0]?.rescheduledCount || 0)
    return NextResponse.json({ rescheduledCount })
  } catch (error) {
    console.error('Error fetching rescheduled calls:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
