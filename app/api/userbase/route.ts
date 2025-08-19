import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { users, userbase } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

    // If user doesn't exist in DB yet, return empty data instead of 404
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, returning empty userbase`);
      return NextResponse.json([]);
    }

    const data = await db
      .select()
      .from(userbase)
      .where(eq(userbase.user_id, userId))
      .limit(10)

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching user base:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}