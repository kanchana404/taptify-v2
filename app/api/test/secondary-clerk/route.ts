import { NextResponse } from 'next/server';
import { createSecondaryClerkUser } from '@/lib/clerk-utils';

export async function POST(request: Request) {
  try {
    const { email, primaryUserId } = await request.json();

    if (!email || !primaryUserId) {
      return NextResponse.json({
        success: false,
        error: 'Email and primaryUserId are required'
      }, { status: 400 });
    }

    console.log(`Testing secondary Clerk account creation for email: ${email}, primaryUserId: ${primaryUserId}`);

    const secondaryUser = await createSecondaryClerkUser(email, primaryUserId, {
      test: true,
      created_at: new Date().toISOString()
    });

    if (!secondaryUser) {
      return NextResponse.json({
        success: false,
        error: 'Secondary Clerk account creation returned null - check configuration'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      secondaryUser,
      message: 'Secondary Clerk account created successfully'
    });

  } catch (error) {
    console.error('Error testing secondary Clerk account creation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 