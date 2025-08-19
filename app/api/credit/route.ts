import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { companyData, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
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

    console.log(`Looking for credits for user ${userId} with email ${userEmail}`);
    
    // First, try to find the user by Clerk user ID
    let [company] = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, userId));
    
    // If not found by Clerk user ID, try to find by email
    if (!company) {
      console.log(`User ${userId} not found in company_data, trying to find by email ${userEmail}`);
      
      // Find user by email in users table
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.email, userEmail))
        .limit(1);
      
      if (userRecord) {
        console.log(`Found user by email: ${userRecord.id}, looking for company data`);
        
        // Now look for company data with the found user ID
        [company] = await db
          .select()
          .from(companyData)
          .where(eq(companyData.user_id, userRecord.id));
        
        if (company) {
          console.log(`Found company data for user ${userRecord.id} (found by email)`);
        }
      }
    }
    
    // If company data doesn't exist yet, return default credits instead of 404
    if (!company) {
      console.log(`Company data not found for user ${userId} or email ${userEmail}, returning default credits`);
      return NextResponse.json({ 
        credits: 0,
        debug: {
          message: "Company data not found",
          userId,
          userEmail,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    return NextResponse.json({ 
      credits: company.credits,
      debug: {
        message: "Company data found",
        userId: company.user_id,
        userEmail,
        companyId: company.id,
        lastUpdated: company.updated_at,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return NextResponse.json({ 
      error: "Failed to fetch credits",
      debug: {
        message: "Database error",
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}
