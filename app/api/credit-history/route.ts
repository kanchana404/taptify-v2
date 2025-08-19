import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { callHistory, users, companyData } from "@/db/schema";
import { sql, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  // Get the authenticated user ID
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query parameters for pagination
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    // Get the current user's email from Clerk
    const user = await currentUser();
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: "User email not found",
        debug: {
          message: "No email found for user",
          userId,
          timestamp: new Date().toISOString()
        }
      }, { status: 400 });
    }

    console.log(`Looking for credit history for user ${userId} with email ${userEmail}`);
    
    // First, try to find the user by Clerk user ID
    let foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // If not found by Clerk user ID, try to find by email
    if (!foundUser.length) {
      console.log(`User ${userId} not found in users table, trying to find by email ${userEmail}`);
      
      foundUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);
      
      if (foundUser.length > 0) {
        console.log(`Found user by email: ${foundUser[0].id}`);
      }
    }
    
    // If user doesn't exist in local DB, return empty data instead of 404
    if (!foundUser.length) {
      return NextResponse.json({
        data: [],
        currentBalance: 0,
        totalCount: 0,
        debug: {
          message: "User not found in local database, returning empty results",
          userId,
          userEmail,
          rawData: [],
          ormData: []
        }
      });
    }

    // Use the found user ID (either from Clerk or from email lookup)
    const actualUserId = foundUser[0].id;
    console.log(`Using user ID ${actualUserId} for credit lookup`);

    // Fetch current credit balance
    const companyInfo = await db
      .select({ credits: companyData.credits })
      .from(companyData)
      .where(eq(companyData.user_id, actualUserId))
      .limit(1);
    
    const currentBalance = companyInfo.length > 0 ? companyInfo[0].credits : 0;

    // Let's debug what's in the database with a direct SQL query
    const rawData = await db.execute(
      sql`SELECT id, aaname, duration, credit_cost FROM call_history WHERE user_id = ${actualUserId} ORDER BY createdtime DESC LIMIT ${limit}`
    );
    console.log('Raw Database Data:', JSON.stringify(rawData, null, 2));

    // Query to get call history with credit usage from the database
    const history = await db
      .select({
        id: callHistory.id,
        date: callHistory.createdtime,
        aaname: callHistory.aaname,
        phone: callHistory.phone,
        duration: callHistory.duration,
        calltype: callHistory.calltype,
        callstatus: callHistory.callstatus,
        creditUsage: callHistory.credit_cost // Correctly reference the credit_cost column
      })
      .from(callHistory)
      .where(
        sql`${callHistory.user_id} = ${actualUserId}`
      )
      .orderBy(desc(callHistory.createdtime))
      .limit(limit)
      .offset(offset);
    
    console.log('Drizzle ORM Result:', JSON.stringify(history, null, 2));

    // Get total count for pagination
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(callHistory)
      .where(
        sql`${callHistory.user_id} = ${actualUserId}`
      );
    
    const totalCount = countResult[0]?.count || 0;

    // Transform the data to include all required fields
    const creditHistory = history.map(call => {
      // Calculate a temporary value if credit_cost is zero/null
      const calculatedCredit = call.duration ? Number(call.duration) / 60 + 1 : 1;
      
      return {
        ...call,
        // Use credit_cost from DB if it exists, otherwise use calculated value
        creditUsage: call.creditUsage || calculatedCredit,
        calculatedCredit: calculatedCredit.toFixed(2), // For debugging comparison
        date: call.date,
        description: `Call to ${call.aaname || 'customer'} (${call.phone})`,
        type: 'debit'
      };
    });

    return NextResponse.json({
      data: creditHistory,
      currentBalance,
      totalCount,
      debug: {
        rawData: rawData.rows,
        ormData: history
      }
    });
  } catch (error) {
    console.error("Error fetching credit history:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit history data", details: error.message },
      { status: 500 }
    );
  }
}