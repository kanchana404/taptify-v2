import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { companyData, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { creditAmount } = await req.json();

    if (!creditAmount || typeof creditAmount !== 'number') {
      return NextResponse.json({ error: 'Credit amount is required and must be a number' }, { status: 400 });
    }

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

    console.log(`Updating credits for user ${userId} with email ${userEmail}: +${creditAmount} credits`);

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
    
    if (!foundUser.length) {
      return NextResponse.json({ 
        error: 'User not found in database',
        debug: {
          message: "User not found by ID or email",
          userId,
          userEmail,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Use the found user ID (either from Clerk or from email lookup)
    const actualUserId = foundUser[0].id;
    console.log(`Using user ID ${actualUserId} for credit operations`);

    // Find the user's data in company_data table
    const existingCompanyData = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, actualUserId))
      .limit(1);

    if (existingCompanyData.length > 0) {
      // Update existing record by adding to current credits
      const currentCredits = existingCompanyData[0].credits || 0;
      const newCredits = currentCredits + creditAmount;
      
      await db
        .update(companyData)
        .set({ 
          credits: newCredits,
          updated_at: new Date()
        })
        .where(eq(companyData.user_id, actualUserId));
        
      console.log(`Updated user ${actualUserId} credits from ${currentCredits} to ${newCredits}`);
      
      return NextResponse.json({ 
        success: true, 
        previousCredits: currentCredits, 
        newCredits: newCredits,
        addedCredits: creditAmount,
        userId: actualUserId,
        userEmail
      });
    } else {
      // Create new company data record
      await db
        .insert(companyData)
        .values({
          user_id: actualUserId,
          credits: creditAmount,
          created_at: new Date(),
          updated_at: new Date()
        });
        
      console.log(`Created new company data for user ${actualUserId} with ${creditAmount} credits`);
      
      return NextResponse.json({ 
        success: true, 
        previousCredits: 0, 
        newCredits: creditAmount,
        addedCredits: creditAmount,
        userId: actualUserId,
        userEmail
      });
    }
  } catch (error) {
    console.error('Error updating credits for user:', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current user's credits
export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    if (!foundUser.length) {
      return NextResponse.json({ 
        error: 'User not found in database',
        debug: {
          message: "User not found by ID or email",
          userId,
          userEmail,
          timestamp: new Date().toISOString()
        }
      }, { status: 404 });
    }

    // Use the found user ID (either from Clerk or from email lookup)
    const actualUserId = foundUser[0].id;
    console.log(`Using user ID ${actualUserId} for credit lookup`);

    // Find the user's data in company_data table
    const userCompanyData = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, actualUserId))
      .limit(1);

    if (userCompanyData.length > 0) {
      return NextResponse.json({ 
        success: true, 
        credits: userCompanyData[0].credits || 0,
        userId: actualUserId,
        userEmail
      });
    } else {
      return NextResponse.json({ 
        success: true, 
        credits: 0,
        userId: actualUserId,
        userEmail
      });
    }
  } catch (error) {
    console.error('Error retrieving credits for user:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve credits' },
      { status: 500 }
    );
  }
}
