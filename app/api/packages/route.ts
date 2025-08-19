import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { packages, users } from "@/db/schema";
import { eq, or, isNull } from "drizzle-orm";
import { createUser } from "@/actions/UserAction";

export async function GET(req: NextRequest) {
  // Get the authenticated user ID
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure user exists in database
    let actualUserId = userId;
    let userOrgId: number | null = null;
    
    const existingUser = await db
      .select({ org_id: users.org_id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      console.log(`User ${userId} not found in database, creating user first`);
      try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
        
        const createdUser = await createUser({
          id: userId,
          email: userEmail,
          userLocalTime: new Date().toISOString(),
        });
        console.log(`User created/retrieved successfully: ${JSON.stringify(createdUser)}`);
        actualUserId = createdUser.id;
        userOrgId = createdUser.org_id;
      } catch (error) {
        console.error(`Error creating user ${userId}:`, error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else {
      userOrgId = existingUser[0].org_id;
    }

    console.log(`Fetching packages for user ${actualUserId} with org_id: ${userOrgId}`);

    // First, try to fetch packages for the user's specific org_id
    let availablePackages: any[] = [];
    
    if (userOrgId !== null) {
      availablePackages = await db
        .select()
        .from(packages)
        .where(eq(packages.org_id, userOrgId));

      console.log(`Found ${availablePackages.length} packages for org_id: ${userOrgId}`);
    }

    // If no packages found for user's org_id, try to get packages for org_id 387 (default)
    if (availablePackages.length === 0 && userOrgId !== 387) {
      console.log(`No packages found for org_id: ${userOrgId}, trying default org_id: 387`);
      availablePackages = await db
        .select()
        .from(packages)
        .where(eq(packages.org_id, 387));
      
      console.log(`Found ${availablePackages.length} packages for default org_id: 387`);
    }

    // If still no packages found, get all packages (fallback)
    if (availablePackages.length === 0) {
      console.log(`No packages found for org_id: ${userOrgId} or default org_id: 387, returning all packages`);
      availablePackages = await db
        .select()
        .from(packages);
      
      console.log(`Found ${availablePackages.length} total packages in database`);
    }

    // Convert price to number for each package and ensure all fields are included
    const formattedPackages = availablePackages.map(pkg => ({
      ...pkg,
      price: Number(pkg.price),
      credit_count: pkg.credit_count || 0,
      sms_count: pkg.sms_count || 0
    }));

    console.log(`Returning ${formattedPackages.length} packages for user ${actualUserId} (org_id: ${userOrgId})`);
    return NextResponse.json({ packages: formattedPackages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
} 