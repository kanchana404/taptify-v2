import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { userOnboarding, users } from '@/db/schema';
import { createUser } from '@/actions/UserAction';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check if user has onboarding record using the actual user ID
    const onboardingRecord = await db
      .select()
      .from(userOnboarding)
      .where(eq(userOnboarding.user_id, actualUserId))
      .limit(1);

    if (onboardingRecord.length === 0) {
      // Create initial onboarding record
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

      return NextResponse.json({
        onboarding_completed: false,
        completed_steps: [],
        current_step_index: 0,
        profile_completed: false,
        voice_selected: false,
        google_connected: false,
      });
    }

    const record = onboardingRecord[0];
    const completedSteps = [];
    
    if (record.profile_completed) completedSteps.push('profile');
    if (record.voice_selected) completedSteps.push('voice');
    if (record.google_connected) completedSteps.push('google');

    const stepIndex = ['profile', 'voice', 'google'].indexOf(record.current_step);
    
    console.log('Onboarding status for user:', actualUserId);
    console.log('- Profile completed:', record.profile_completed);
    console.log('- Voice selected:', record.voice_selected);
    console.log('- Google connected:', record.google_connected);
    console.log('- Current step:', record.current_step);
    console.log('- Onboarding completed:', record.onboarding_completed);
    console.log('- Completed steps:', completedSteps);

    return NextResponse.json({
      onboarding_completed: record.onboarding_completed,
      completed_steps: completedSteps,
      current_step_index: Math.max(0, stepIndex),
      profile_completed: record.profile_completed,
      voice_selected: record.voice_selected,
      google_connected: record.google_connected,
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 