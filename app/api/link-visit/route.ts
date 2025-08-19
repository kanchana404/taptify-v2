import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { link, callHistory, userbase } from "@/db/schema";
import { and, eq, gte, lt, sql, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse date filters (defaults to last 30 days)
    const url = new URL(req.url);
    const startDateQuery = url.searchParams.get("startDate");
    const endDateQuery = url.searchParams.get("endDate");
    
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    
    let startDate, endDate;
    try {
      startDate = startDateQuery ? new Date(startDateQuery) : defaultStartDate;
      endDate = endDateQuery ? new Date(endDateQuery) : new Date();
      
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

    // Get link stats
    const [linkStatusResult] = await db
      .select({
        linksSent: sql<number>`COUNT(CASE WHEN ${link.link_sent} = 'yes' THEN 1 END)`,
        linksViewed: sql<number>`COUNT(CASE WHEN ${link.link_status} = 'visit' THEN 1 END)`
      })
      .from(link)
      .innerJoin(callHistory, eq(link.call_id, callHistory.id))
      .where(
        and(
          eq(callHistory.user_id, userId),
          gte(callHistory.createdtime, startDate),
          lt(callHistory.createdtime, endDateExclusive)
        )
      );

    // Get recent links
    const recentLinks = await db
      .select({
        id: link.link_id,
        name: userbase.aaname,
        phone: userbase.phone,
        clicked: sql<boolean>`${link.link_status} = 'visit'`,
        sentTime: callHistory.createdtime
      })
      .from(link)
      .innerJoin(callHistory, eq(link.call_id, callHistory.id))
      .innerJoin(userbase, and(
        eq(userbase.user_id, callHistory.user_id),
        eq(userbase.phone, callHistory.phone)
      ))
      .where(
        and(
          eq(callHistory.user_id, userId),
          eq(link.link_sent, 'yes'),
          gte(callHistory.createdtime, startDate),
          lt(callHistory.createdtime, endDateExclusive)
        )
      )
      .orderBy(desc(callHistory.createdtime))
      .limit(5);

    // Default to 0 if no results
    const linkStatus = {
      linksSent: linkStatusResult?.linksSent ?? 0,
      linksViewed: linkStatusResult?.linksViewed ?? 0
    };

    return NextResponse.json({
      linkStatus,
      recentLinks
    });
  } catch (error) {
    console.error("Error in link-visit endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}