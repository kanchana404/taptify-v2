// app/api/reviews/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { users, reviews, callHistory } from '@/db/schema';
import { eq, sql, and, count, desc, gte, lt } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse date filters (defaults to last 30 days)
    const url = new URL(req.url);
    const startDateQuery = url.searchParams.get('startDate');
    const endDateQuery = url.searchParams.get('endDate');
    
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    let startDate, endDate;
    try {
      startDate = startDateQuery ? new Date(startDateQuery) : defaultStartDate;
      endDate = endDateQuery ? new Date(endDateQuery) : new Date();
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (e) {
      console.error('Date parsing error:', e);
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Create an exclusive upper bound by adding one day to endDate
    const endDateExclusive = new Date(endDate);
    endDateExclusive.setDate(endDateExclusive.getDate() + 1);

    // Base conditions for filtering
    const conditions = and(
      eq(callHistory.user_id, userId),
      gte(callHistory.createdtime, startDate),
      lt(callHistory.createdtime, endDateExclusive),
      sql`${callHistory.score} IS NOT NULL`,
      sql`${callHistory.score} != 'null'`,
      sql`${callHistory.score} != ''`
    );

    // Get all valid call scores
    const scores = await db
      .select({
        score: callHistory.score
      })
      .from(callHistory)
      .where(conditions);

    // Process scores into rating categories
    const ratingCounts = {
      'Good': 0,
      'Neutral': 0,
      'Bad': 0
    };

    scores.forEach(item => {
      try {
        if (item.score) {
          const numScore = parseFloat(item.score);
          if (!isNaN(numScore)) {
            if (numScore >= 7) {
              ratingCounts['Good']++;
            } else if (numScore >= 4) {
              ratingCounts['Neutral']++;
            } else {
              ratingCounts['Bad']++;
            }
          }
        }
      } catch (e) {
        console.error('Error processing score:', item.score, e);
      }
    });

    // Convert to the format expected by the chart
    const ratings = [
      { name: 'Good', value: ratingCounts['Good'], color: 'hsl(280, 80%, 50%)', range: '7-10' },
      { name: 'Neutral', value: ratingCounts['Neutral'], color: 'hsl(270, 70%, 60%)', range: '4-7' },
      { name: 'Bad', value: ratingCounts['Bad'], color: 'hsl(250, 50%, 40%)', range: '1-4' }
    ];

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Error in reviews endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}