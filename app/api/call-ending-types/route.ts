// app/api/ended-reasons/route.ts
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

  // Verify the user exists in the DB - but don't return 404 for new users
  const foundUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  // If user doesn't exist in DB yet, return default data instead of 404
  if (!foundUser.length) {
    console.log(`User ${userId} not found in database, returning default call ending types`);
    return NextResponse.json([
      { name: "Client Disconnected", value: 0 },
      { name: "Agent Disconnected", value: 0 }
    ]);
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
  // Create an exclusive upper bound to include the full end date
  const endDateExclusive = new Date(endDateValue);
  endDateExclusive.setDate(endDateExclusive.getDate() + 1);

  try {
    // Query to count occurrences of each ended_reason type within the date range
    const results = await db
      .select({
        name: callHistory.ended_reason,
        value: count(callHistory.id)
      })
      .from(callHistory)
      .where(
        sql`${callHistory.ended_reason} IS NOT NULL 
             AND ${callHistory.user_id} = ${userId}
             AND ${callHistory.createdtime} >= ${startDateValue}
             AND ${callHistory.createdtime} < ${endDateExclusive}`
      )
      .groupBy(callHistory.ended_reason);

    // Map the results to user-friendly names
    const formattedResults = results.map(item => ({
      name:
        item.name === "customer-ended-call"
          ? "Client Disconnected"
          : item.name === "assistant-said-end-call-phrase"
          ? "Agent Disconnected"
          : "Silent Disconnect", // Fallback for any other values
      value: Number(item.value)
    }));

    // Return default structure if no data is found
    if (formattedResults.length === 0) {
      return NextResponse.json([
        { name: "Client Disconnected", value: 0 },
        { name: "Agent Disconnected", value: 0 }
      ]);
    }

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("Error fetching call ending types:", error);
    return NextResponse.json(
      { error: "Failed to fetch call ending types data" },
      { status: 500 }
    );
  }
}
