import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { and, eq, desc, sql } from 'drizzle-orm'
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
      console.log(`User ${userId} not found in database, returning empty calls`);
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const linkIdParam = searchParams.get('linkId')
    const startDateQuery = searchParams.get('startDate')
    const endDateQuery = searchParams.get('endDate')

    // Default to last 7 days if no startDate is provided
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 7)

    const startDateValue = startDateQuery ? new Date(startDateQuery) : defaultStartDate
    const endDateValue = endDateQuery ? new Date(endDateQuery) : new Date()

    // Add one day to endDate for an exclusive upper bound so the full end date is included
    const endDateExclusive = new Date(endDateValue)
    endDateExclusive.setDate(endDateExclusive.getDate() + 1)

    const conditions = [eq(callHistory.user_id, userId)]
    
    if (type) {
      const dbCallType = type === 'inbound' ? 'inboundPhoneCall' : 'outboundPhoneCall'
      conditions.push(eq(callHistory.calltype, dbCallType))
    }
    
    // Add consistent date filtering
    conditions.push(sql`${callHistory.createdtime} >= ${startDateValue}`)
    conditions.push(sql`${callHistory.createdtime} < ${endDateExclusive}`)

    // Build the join condition with the link table
    const joinCondition = linkIdParam
      ? and(eq(link.link_id, linkIdParam), eq(link.call_id, callHistory.id))
      : eq(link.call_id, callHistory.id)

    const data = await db
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
        linkClicked: link.link_status,
        clickedTime: link.clicked_time,
      })
      .from(callHistory)
      .leftJoin(link, joinCondition)
      .where(and(...conditions))
      .orderBy(desc(callHistory.createdtime))
      .limit(10)

    // Map the data to transform ended_reason values with correct hyphenated format matching
    const mappedData = data.map(call => {
      let formattedEndReason = call.ended_reason;
      
      // Match hyphenated formats exactly as they appear in the database
      if (call.ended_reason === 'assistant-said-end-call-phrase') {
        formattedEndReason = 'Agent Ended the Call';
      } else if (call.ended_reason === 'customer-ended-call') {
        formattedEndReason = 'Customer Ended The Call';
      }
      
      return {
        ...call,
        ended_reason: formattedEndReason
      };
    });

    return NextResponse.json(mappedData)
  } catch (error) {
    console.error('Error fetching call history:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}