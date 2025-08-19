import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Test proxy endpoint called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 401 }
      );
    }

    // Test with a simple Google API call to verify token works
    const testResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { 
          error: 'Token validation failed',
          status: testResponse.status,
          statusText: testResponse.statusText
        },
        { status: testResponse.status }
      );
    }

    const userInfo = await testResponse.json();
    
    return NextResponse.json({
      success: true,
      message: 'Proxy test successful',
      userInfo: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name
      },
      tokenInfo: {
        hasToken: !!accessToken,
        tokenPreview: accessToken ? `${accessToken.substring(0, 10)}...` : 'none'
      }
    });

  } catch (error) {
    console.error('Error in test proxy:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}