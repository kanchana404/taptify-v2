import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { userbase } from "@/db/schema";
import { and, eq, isNotNull, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Get status filter from URL query parameters (if any)
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "all";
    
    // Build the base query
    let query = db
      .select({
        id: userbase.id,
        aaname: userbase.aaname,
        phone: userbase.phone,
        recalldate: userbase.recalldate,
        lastvisitdate: userbase.lastvisitdate,
        callattempts: userbase.callattempts,
        recallstatus: userbase.recallstatus,
      })
      .from(userbase)
      .where(
        and(
          eq(userbase.user_id, userId),
          isNotNull(userbase.recalldate),
          sql`${userbase.recalldate} != ''` // Ensure recalldate is not an empty string
        )
      );
      
    // Apply status filter if needed
    if (status === "active") {
      query = query.where(
        eq(userbase.recallstatus, "active")
      );
    } else if (status === "triggered") {
      query = query.where(
        eq(userbase.recallstatus, "triggered")
      );
    } else if (status === "canceled") {
      query = query.where(
        eq(userbase.recallstatus, "canceled")
      );
    }
    
    // Execute the query and order by recall date
    const rescheduledCalls = await query.orderBy(userbase.recalldate);

    return NextResponse.json(rescheduledCalls);
  } catch (error) {
    console.error("Error fetching rescheduled calls:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}