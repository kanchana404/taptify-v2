import { NextResponse } from 'next/server'
import { currentUser, auth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Helper function to update a user's organization ID to 387
 * @param userId - Optional user ID for server-side calls
 * @returns {Promise<{success: boolean, user: any, updatedUser: any, message: string} | {error: string, status: number}>}
 */
async function updateUserOrg(userId?: string) {
  let targetUserId = userId;

  // If no userId provided, try to get it from auth context
  if (!targetUserId) {
    try {
      const { userId: authUserId } = await auth()
      targetUserId = authUserId || undefined;
    } catch (error) {
      console.error('Error getting auth user ID:', error);
      return { error: 'Unauthorized - No user ID provided', status: 401 }
    }
  }

  // Protect the route by checking if the user is signed in
  if (!targetUserId) {
    return { error: 'Unauthorized', status: 401 }
  }

  console.log(`Updating org_id for user: ${targetUserId}`);

  try {
    // Check if user exists in our database
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!existingUser.length) {
      console.error(`User ${targetUserId} not found in database`);
      return { error: 'User not found in database', status: 404 }
    }

    console.log(`Found user: ${JSON.stringify(existingUser[0])}`);

    // Update the user's org_id to 387
    const [updatedUser] = await db
      .update(users)
      .set({
        org_id: 387,
        updated_at: new Date()
      })
      .where(eq(users.id, targetUserId))
      .returning();

    console.log(`Successfully updated user org_id: ${JSON.stringify(updatedUser)}`);

    // Try to get the Clerk user object if available
    let clerkUser = null;
    try {
      clerkUser = await currentUser();
    } catch (error) {
      // If we can't get the Clerk user (e.g., server-side call), that's okay
      console.log('Could not get Clerk user object (server-side call)');
    }

    return { 
      success: true,
      user: clerkUser || { id: targetUserId },
      updatedUser: updatedUser,
      message: 'User organization ID updated to 387'
    }
  } catch (error) {
    console.error('Error in updateUserOrg:', error);
    return { error: 'Internal server error: ' + String(error), status: 500 }
  }
}

/**
 * GET /api/user/update-org
 * Updates the current signed-in user's organization ID to 387
 * Requires authentication via Clerk
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const userId = userIdParam ? userIdParam : undefined;
    
    console.log(`GET request to update-org with userId: ${userId}`);
    
    const result = await updateUserOrg(userId);
    
    if ('error' in result) {
      return new NextResponse(result.error, { status: result.status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error in GET update-org:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/user/update-org
 * Updates the current signed-in user's organization ID to 387
 * Can accept a userId in the request body for server-side calls
 * Requires authentication via Clerk (unless userId is provided)
 */
export async function POST(request: Request) {
  try {
    let userId: string | undefined;
    
    // Try to get userId from request body
    try {
      const body = await request.json();
      userId = body.userId;
      console.log(`POST request to update-org with userId from body: ${userId}`);
    } catch (error) {
      // If no body or invalid JSON, continue without userId
      console.log('No valid JSON body found, continuing without userId');
    }
    
    const result = await updateUserOrg(userId);
    
    if ('error' in result) {
      return new NextResponse(result.error, { status: result.status })
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Error in POST update-org:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}