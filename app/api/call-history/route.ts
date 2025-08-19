import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { and, eq, desc, sql, inArray } from 'drizzle-orm'
import { callHistory, users, link } from '@/db/schema'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user exists in the DB - but don't return 404 for new users
    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    // If user doesn't exist in DB yet, return empty data instead of 404
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, returning empty call history`);
      return NextResponse.json({
        calls: [],
        pagination: {
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0
        }
      });
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const linkIdParam = searchParams.get('linkId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const phone = searchParams.get('phone')

    // Log the request parameters - safely
    console.log("Request parameters:", { type, linkIdParam, startDate, endDate, phone });

    const conditions = [eq(callHistory.user_id, userId)];
    
    // Handle phone number filtering if provided
    if (phone) {
      console.log(`Filtering by phone: ${phone}`);
      conditions.push(eq(callHistory.phone, phone));
    }
    
    // Handle call type filtering
    if (type) {
      const dbCallType = type === 'inbound' ? 'inboundPhoneCall' : 'outboundPhoneCall';
      console.log(`Filtering by call type: ${dbCallType}`);
      conditions.push(eq(callHistory.calltype, dbCallType));
    }
    
    // Add date filtering if provided
    if (startDate) {
      console.log(`Filtering by start date: ${startDate}`);
      conditions.push(sql`${callHistory.createdtime} >= ${new Date(startDate)}`);
    }
    if (endDate) {
      // Add 1 day to include the end date fully
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      console.log(`Filtering by end date: ${endDate} (until ${nextDay})`);
      conditions.push(sql`${callHistory.createdtime} < ${nextDay}`);
    }

    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(callHistory)
      .where(and(...conditions));

    // Get call records with pagination
    console.log("Fetching call records...");
    const callRecords = await db
      .select({
        id: callHistory.id,
        user_id: callHistory.user_id,
        aaname: callHistory.aaname,
        phone: callHistory.phone,
        calltype: callHistory.calltype,
        callstatus: callHistory.callstatus,
        score: callHistory.score,
        sms: callHistory.sms,
        createdtime: callHistory.createdtime,
        record_url: callHistory.record_url,
        duration: callHistory.duration,
        ended_reason: callHistory.ended_reason,
      })
      .from(callHistory)
      .where(and(...conditions))
      .orderBy(desc(callHistory.createdtime))
      .limit(pageSize)
      .offset(offset);

    // Log the raw call records retrieved
    console.log(`Retrieved ${callRecords.length} call records`);
    if (callRecords.length > 0) {
      console.log("First call record sample:", {
        id: callRecords[0].id,
        calltype: callRecords[0].calltype,
        phone: callRecords[0].phone,
        callstatus: callRecords[0].callstatus
      });
    }
    
    // Create a unique set of calls - but preserve BOTH inbound and outbound
    // Use a composite key of ID + call type to ensure we don't lose different call types
    const uniqueCalls = [];
    const seenCallKeys = new Set();
    
    callRecords.forEach(call => {
      const key = `${call.id}-${call.calltype}`;
      if (!seenCallKeys.has(key)) {
        seenCallKeys.add(key);
        uniqueCalls.push(call);
      }
    });
    
    console.log(`After deduplication: ${uniqueCalls.length} unique calls`);

    return NextResponse.json({
      calls: uniqueCalls,
      pagination: {
        total: totalCount[0]?.count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / pageSize)
      }
    });
  } catch (error) {
    console.error('Error fetching call history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}