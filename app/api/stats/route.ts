import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { callHistory, users, userbase, link } from "@/db/schema";
import { and, eq, gte, lt, sql, isNotNull, asc, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user exists - but don't return 404 for new users
    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // If user doesn't exist in DB yet, return default data instead of 404
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, returning default stats`);
      const defaultResponse = {
        inboundCalls: 0,
        inboundCompletedCalls: 0,
        inboundPendingCalls: 0,
        outboundCalls: 0,
        outboundCompletedCalls: 0,
        outboundPendingCalls: 0,
        inboundDuration: 0,
        outboundDuration: 0,
        smsSent: 0,
        smsClicked: 0,
        callsAnswered: 0,
        callsPending: 0,
        rescheduledCalls: 0,
        avgSatisfactionRate: 0,
        maxSatisfactionRate: null,
        minSatisfactionRate: null,
        answerRate: "0%",
      };
      return NextResponse.json(defaultResponse);
    }

    // Parse date filters (defaults to last 7 days)
    const url = new URL(req.url);
    const startDateQuery = url.searchParams.get("startDate");
    const endDateQuery = url.searchParams.get("endDate");
    
    // Debug logging to check what date parameters are coming in
    console.log("Date query parameters:", { startDateQuery, endDateQuery });
    
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);
    
    // Ensure proper date parsing
    let startDate, endDate;
    try {
      startDate = startDateQuery ? new Date(startDateQuery) : defaultStartDate;
      endDate = endDateQuery ? new Date(endDateQuery) : new Date();
      
      // Validate the dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error("Invalid date format");
      }
    } catch (e) {
      console.error("Date parsing error:", e);
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    // Create an exclusive upper bound by adding one day to endDate
    const endDateExclusive = new Date(endDate);
    endDateExclusive.setDate(endDateExclusive.getDate() + 1);

    // Debug logging for the parsed dates
    console.log("Parsed date range:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      endDateExclusive: endDateExclusive.toISOString()
    });

    const conditions = and(
      eq(callHistory.user_id, userId),
      gte(callHistory.createdtime, startDate),
      lt(callHistory.createdtime, endDateExclusive)
    );

    // Log the SQL query for debugging
    console.log("Executing query with conditions:", conditions);

    // Aggregate stats using CASE WHEN expressions
    const [result] = await db
      .select({
        inboundCalls: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'inboundPhoneCall' THEN 1 ELSE 0 END), 0)`,
        inboundCompletedCalls: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'inboundPhoneCall' AND ${callHistory.callstatus} = 'Completed' THEN 1 ELSE 0 END), 0)`,
        inboundPendingCalls: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'inboundPhoneCall' AND ${callHistory.callstatus} != 'Completed' THEN 1 ELSE 0 END), 0)`,
        outboundCalls: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'outboundPhoneCall' THEN 1 ELSE 0 END), 0)`,
        outboundCompletedCalls: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'outboundPhoneCall' AND ${callHistory.callstatus} = 'Completed' THEN 1 ELSE 0 END), 0)`,
        outboundPendingCalls: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'outboundPhoneCall' AND ${callHistory.callstatus} != 'Completed' THEN 1 ELSE 0 END), 0)`,
        inboundDuration: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'inboundPhoneCall' THEN ${callHistory.duration} ELSE 0 END), 0)`,
        outboundDuration: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.calltype} = 'outboundPhoneCall' THEN ${callHistory.duration} ELSE 0 END), 0)`,
        smsSent: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.sms} = 'yes' THEN 1 ELSE 0 END), 0)`,
        callsAnswered: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.callstatus} = 'Completed' THEN 1 ELSE 0 END), 0)`,
        callsPending: sql<number>`COALESCE(SUM(CASE WHEN ${callHistory.callstatus} != 'Completed' THEN 1 ELSE 0 END), 0)`,
        avgSatisfactionRate: sql<number>`AVG(
          CASE WHEN ${callHistory.score} IS NULL OR ${callHistory.score} = 'null' 
          THEN NULL 
          ELSE CAST(${callHistory.score} AS FLOAT) END
        )`,
        maxSatisfactionRate: sql<number>`MAX(
          CASE WHEN ${callHistory.score} IS NULL OR ${callHistory.score} = 'null' 
          THEN NULL 
          ELSE CAST(${callHistory.score} AS FLOAT) END
        )`,
        minSatisfactionRate: sql<number>`MIN(
          CASE WHEN ${callHistory.score} IS NULL OR ${callHistory.score} = 'null' 
          THEN NULL 
          ELSE CAST(${callHistory.score} AS FLOAT) END
        )`
      })
      .from(callHistory)
      .where(conditions);

    // Count SMS links clicked
    const [smsClickedResult] = await db
      .select({
        smsClicked: sql<number>`COUNT(*)`
      })
      .from(link)
      .innerJoin(callHistory, eq(link.call_id, callHistory.id))
      .where(
        and(
          eq(callHistory.user_id, userId),
          eq(link.link_sent, 'yes'),
          eq(link.link_status, 'visit'),
          gte(callHistory.createdtime, startDate),
          lt(callHistory.createdtime, endDateExclusive)
        )
      );

    // Count rescheduled calls from userbase table where recalldate is not null
    let rescheduledConditions = and(
      eq(userbase.user_id, userId),
      isNotNull(userbase.recalldate),
      sql`${userbase.recalldate} != ''` // Ensure recalldate is not an empty string
    );

    // Only apply date filtering if we want scheduled calls within the date range
    // This shows all future scheduled calls regardless of the current filter
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [rescheduledResult] = await db
      .select({
        rescheduledCalls: sql<number>`COUNT(*)`
      })
      .from(userbase)
      .where(
        and(
          eq(userbase.user_id, userId),
          isNotNull(userbase.recalldate),
          sql`${userbase.recalldate} != ''`, // Ensure recalldate is not an empty string
          sql`${userbase.recalldate} != '[null]'`, // Handle case where value is literally "[null]" string
          sql`CAST(
            CASE 
              WHEN ${userbase.recalldate} ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN ${userbase.recalldate}
              ELSE NULL 
            END
            AS DATE) >= ${today.toISOString().split('T')[0]}` // Only valid date formats
        )
      );

    // Calculate answer rate as a percentage with no decimal points
    const totalOutbound = (result?.outboundCalls ?? 0);
    const outboundCompleteCount = result?.outboundCompletedCalls ?? 0;
    
    // Calculate the answer rate
    const answerRateValue = totalOutbound > 0 
      ? Math.min(100, Math.round((outboundCompleteCount / totalOutbound) * 100)) 
      : 0;
    const answerRate = `${answerRateValue}%`;

    // Default all values to 0 when not available
    const responseData = {
      inboundCalls: result?.inboundCalls ?? 0,
      inboundCompletedCalls: result?.inboundCompletedCalls ?? 0,
      inboundPendingCalls: result?.inboundPendingCalls ?? 0,
      outboundCalls: result?.outboundCalls ?? 0,
      outboundCompletedCalls: result?.outboundCompletedCalls ?? 0,
      outboundPendingCalls: result?.outboundPendingCalls ?? 0,
      inboundDuration: result?.inboundDuration ?? 0,
      outboundDuration: result?.outboundDuration ?? 0,
      smsSent: result?.smsSent ?? 0,
      smsClicked: smsClickedResult?.smsClicked ?? 0,
      callsAnswered: result?.callsAnswered ?? 0,
      callsPending: result?.callsPending ?? 0,
      rescheduledCalls: rescheduledResult?.rescheduledCalls ?? 0,
      avgSatisfactionRate: result?.avgSatisfactionRate ?? 0,
      maxSatisfactionRate: result?.maxSatisfactionRate ?? null,
      minSatisfactionRate: result?.minSatisfactionRate ?? null,
      answerRate,
    };

    console.log("Final response:", responseData);
    
    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error("Error in stats endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Internal Server Error", details: errorMessage }, { status: 500 });
  }
}