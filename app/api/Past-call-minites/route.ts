// app/api/Past-call-minites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { callHistory } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  // Authenticate the user using Clerk
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters for filtering
  const url = new URL(req.url);
  const startDateQuery = url.searchParams.get('startDate');
  const endDateQuery = url.searchParams.get('endDate');

  // Default to last 7 days if no startDate is provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);

  const startDateValue = startDateQuery ? new Date(startDateQuery) : defaultStartDate;
  const endDateValue = endDateQuery ? new Date(endDateQuery) : new Date();

  // Add one day to endDate for an exclusive upper bound (full end date is included)
  const endDateExclusive = new Date(endDateValue);
  endDateExclusive.setDate(endDateExclusive.getDate() + 1);

  try {
    // Query the call_history table for records in the specified period for this user,
    // group the records by the date (extracted from createdtime),
    // and calculate the average duration (in minutes) for each day.
    const result = await db.execute(sql`
      SELECT 
        CAST(createdtime AS date) as day,
        COALESCE(AVG(duration)/60, 0) as avg_minutes
      FROM ${callHistory}
      WHERE createdtime >= ${startDateValue}
        AND createdtime < ${endDateExclusive}
        AND user_id = ${userId}
      GROUP BY CAST(createdtime AS date)
      ORDER BY CAST(createdtime AS date) ASC
    `);

    // Build a mapping from the full date string (YYYY-MM-DD) to the average minutes
    const queryData: Record<string, number> = {};
    result.rows.forEach((row: any) => {
      const dayDate = row.day instanceof Date ? row.day : new Date(row.day);
      const dayStr = dayDate.toISOString().split('T')[0];
      queryData[dayStr] = parseFloat(row.avg_minutes);
    });

    // Generate an array with each day in the filtered range
    const finalData: { date: string; minutes: number }[] = [];
    const current = new Date(startDateValue);
    while (current < endDateExclusive) {
      const dateStr = current.toISOString().split('T')[0];
      // Format date as MM/DD for display purposes
      const formattedDate = `${current.getMonth() + 1}/${current.getDate()}`;
      finalData.push({
        date: formattedDate,
        minutes: queryData[dateStr] || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json(finalData);
  } catch (error: any) {
    console.error('Error fetching past call minutes:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
