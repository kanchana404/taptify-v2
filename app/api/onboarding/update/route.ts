import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { userOnboarding, users } from '@/db/schema';
import { createUser } from '@/actions/UserAction';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { step, data } = body;

    if (!step) {
      return NextResponse.json(
        { error: 'Step is required' },
        { status: 400 }
      );
    }

    // First, check if user exists in the users table
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let actualUserId = userId;

    // If user doesn't exist, create them first
    if (existingUser.length === 0) {
      console.log(`User ${userId} not found in database, creating user first`);
      try {
        // Get user email from Clerk
        const user = await currentUser();
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
        
        const createdUser = await createUser({
          id: userId,
          email: userEmail,
          userLocalTime: new Date().toISOString(),
        });
        console.log(`User created/retrieved successfully: ${JSON.stringify(createdUser)}`);
        
        // Use the actual user ID (might be different if user already existed with same email)
        actualUserId = createdUser.id;
      } catch (error) {
        console.error(`Error creating user ${userId}:`, error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else {
      // User exists, use their ID
      actualUserId = existingUser[0].id;
    }

    // Get current onboarding record using the actual user ID
    let onboardingRecord = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.user_id, actualUserId))
      .limit(1);

    if (onboardingRecord.length === 0) {
      // Create initial onboarding record if it doesn't exist
      console.log(`Creating onboarding record for user ${actualUserId}`);
      await db.insert(userOnboarding).values({
        user_id: actualUserId,
        profile_completed: false,
        voice_selected: false,
        google_connected: false,
        onboarding_completed: false,
        current_step: 'profile',
        created_at: new Date(),
        updated_at: new Date(),
      });
      
      // Fetch the newly created record
      onboardingRecord = await db
        .select()
        .from(userOnboarding)
        .where(eq(userOnboarding.user_id, actualUserId))
        .limit(1);
    }

    const record = onboardingRecord[0];
    const updates: any = {
      updated_at: new Date(),
    };

    // Update based on step
    switch (step) {
      case 'profile':
        updates.profile_completed = true;
        updates.current_step = 'voice';
        break;
      case 'voice':
        updates.voice_selected = true;
        updates.current_step = 'google';
        break;
      case 'google':
        updates.google_connected = data?.connected || false;
        updates.current_step = 'complete';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid step' },
          { status: 400 }
        );
    }

    // Update the record
    await db
      .update(userOnboarding)
      .set(updates)
      .where(eq(userOnboarding.user_id, actualUserId));

    return NextResponse.json({
      message: 'Onboarding step updated successfully',
      step,
      data,
    });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 