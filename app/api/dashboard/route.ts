import { NextResponse } from 'next/server';
import db from '@/db/drizzle';
import { sql, and } from 'drizzle-orm';
import { callHistory, contact, userbase } from '@/db/schema';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    const dateConditions = [];
    if(startDate) dateConditions.push(sql`createdtime >= ${new Date(startDate)}`);
    if(endDate) dateConditions.push(sql`createdtime <= ${new Date(endDate)}`);

    const callsStats = await db
      .select({
        inbound: sql<number>`COUNT(*)`,
        inboundDuration: sql<number>`SUM(duration)`,
        outbound: sql<number>`COUNT(*)`,
        outboundDuration: sql<number>`SUM(duration)`,
        satisfiedCount: sql<number>`COUNT(*)`,
        smsSent: sql<number>`COUNT(*)`,
        callsAnswered: sql<number>`COUNT(*)`,
      })
      .from(callHistory)
      .where(and(...dateConditions))
    
    const {
      inbound,
      outbound,
      inboundDuration,
      outboundDuration,
      satisfiedCount,
      smsSent,
      callsAnswered,
    } = callsStats[0] || {};

    const totalCalls = (inbound || 0) + (outbound || 0);
    const totalDuration = (inboundDuration || 0) + (outboundDuration || 0);
    const avgSatisfactionRate =
      totalCalls > 0 ? ((satisfiedCount / totalCalls) * 100).toFixed(1) : '0.0';

    const contactsData = await db
      .select()
      .from(contact)
      .limit(10);

    const callHistoryData = await db
      .select()
      .from(callHistory)
      .limit(10);

    const userBaseData = await db
      .select()
      .from(userbase)
      .limit(10);

    const rescheduledResult = await db
      .select({
        rescheduledCount: sql<number>`COUNT(*)`
      })
      .from(userbase)
      .where(sql`recalldate IS NOT NULL`);

    const rescheduledCount = Number(rescheduledResult[0]?.rescheduledCount || 0);

    return NextResponse.json({
      stats: {
        inbound: Number(inbound || 0),
        outbound: Number(outbound || 0),
        inboundDuration: Number(inboundDuration || 0),
        outboundDuration: Number(outboundDuration || 0),
        totalCalls: Number(totalCalls || 0),
        totalDuration: Number(totalDuration || 0),
        avgSatisfactionRate,
        smsSent: Number(smsSent || 0),
        callsAnswered: Number(callsAnswered || 0),
        rescheduledCount,
      },
      contacts: contactsData,
      callHistory: callHistoryData,
      userBase: userBaseData,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
