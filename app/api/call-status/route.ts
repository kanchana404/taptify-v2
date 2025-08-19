// app/api/call-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { callHistory, users } from "@/db/schema";
import { sql, count, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // Get the authenticated user ID
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters for filtering by date
  const url = new URL(req.url);
  const startDateQuery = url.searchParams.get('startDate');
  const endDateQuery = url.searchParams.get('endDate');

  // Default to last 7 days if no startDate is provided
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 7);
  const startDateValue = startDateQuery ? new Date(startDateQuery) : defaultStartDate;
  const endDateValue = endDateQuery ? new Date(endDateQuery) : new Date();
  const endDateExclusive = new Date(endDateValue);
  endDateExclusive.setDate(endDateExclusive.getDate() + 1);

  try {
    // Check if the user exists in the DB (but don't fail if they don't)
    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // If user doesn't exist in local DB, return default empty data instead of 404
    if (!foundUser.length) {
      return NextResponse.json([
        { name: "Pending", value: 0 },
        { name: "Complete", value: 0 },
        { name: "User Busy", value: 0 },
        { name: "Not Picked up", value: 0 },
        { name: "Voice Mail", value: 0 },
        { name: "Call scheduled", value: 0 }
      ]);
    }

    // Query to count occurrences of each callstatus type within the date range
    const results = await db
      .select({
        name: callHistory.callstatus,
        value: count(callHistory.id)
      })
      .from(callHistory)
      .where(
        sql`${callHistory.callstatus} IS NOT NULL 
             AND ${callHistory.user_id} = ${userId}
             AND ${callHistory.createdtime} >= ${startDateValue}
             AND ${callHistory.createdtime} < ${endDateExclusive}`
      )
      .groupBy(callHistory.callstatus);

    // Map technical callstatus values to user-friendly names
    const formattedResults = results.map(item => {
      let displayName = item.name;
      if (item.name === "pending") {
        displayName = "Pending";
      } else if (item.name === "completed") {
        displayName = "Complete";
      } else if (item.name === "busy") {
        displayName = "User Busy";
      } else if (item.name === "no-answer") {
        displayName = "Not Picked up";
      } else if (item.name === "voicemail") {
        displayName = "Voice Mail";
      } else if (item.name === "scheduled") {
        displayName = "Call scheduled";
      }

      return {
        name: displayName,
        value: Number(item.value)
      };
    });

    // If no data is found, return a default structure
    if (formattedResults.length === 0) {
      return NextResponse.json([
        { name: "Pending", value: 0 },
        { name: "Complete", value: 0 },
        { name: "User Busy", value: 0 },
        { name: "Not Picked up", value: 0 },
        { name: "Voice Mail", value: 0 },
        { name: "Call scheduled", value: 0 }
      ]);
    }

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("Error fetching call status data:", error);
    return NextResponse.json(
      { error: "Failed to fetch call status data" },
      { status: 500 }
    );
  }
}