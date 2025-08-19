import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { companyData } from '@/db/schema';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      company_name,
      agent_name,
      role,
      contact_number,
      contact_email,
      company_address,
      product_or_service,
      link,
    } = body;

    // Validate required fields
    if (!company_name || !agent_name || !contact_number || !contact_email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already has company data
    const existingData = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, userId))
      .limit(1);

    if (existingData.length > 0) {
      // Update existing data
      await db
        .update(companyData)
        .set({
          company_name,
          agent_name,
          role,
          contact_number,
          contact_email,
          company_address,
          product_or_service,
          link,
          updated_at: new Date(),
        })
        .where(eq(companyData.user_id, userId));
    } else {
      // Create new data
      await db.insert(companyData).values({
        user_id: userId,
        company_name,
        agent_name,
        role,
        contact_number,
        contact_email,
        company_address,
        product_or_service,
        link,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    return NextResponse.json({
      message: 'Profile information saved successfully',
      data: {
        company_name,
        agent_name,
        role,
        contact_number,
        contact_email,
        company_address,
        product_or_service,
        link,
      },
    });
  } catch (error) {
    console.error('Error saving profile information:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Fetching profile data for user:", userId);
    console.log("User ID type:", typeof userId);
    
    // First, let's check if the user exists in the users table
    const userCheck = await db
      .select()
      .from(companyData)
      .limit(5);
    
    console.log("All company data records:", userCheck);
    
    const userData = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, userId))
      .limit(1);

    console.log("Database query result:", userData);
    console.log("Query result length:", userData.length);

    if (userData.length === 0) {
      console.log("No user data found for userId:", userId);
      return NextResponse.json({ data: null });
    }

    console.log("Returning user data:", userData[0]);
    return NextResponse.json({ data: userData[0] });
  } catch (error) {
    console.error('Error fetching profile information:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 