// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { storeOAuthTokens } from '@/lib/oauth-utils';
import { currentUser, auth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createUser } from '@/actions/UserAction';

export async function GET(request: NextRequest) {
  try {
    // Use `auth()` to get the user's ID
    const { userId } = await auth();

    // Protect the route by checking if the user is signed in
    if (!userId) {
      console.log('User not authenticated');
      return NextResponse.redirect(
        new URL('/Intergrations?auth=error&message=' + encodeURIComponent('User not authenticated'), 
        process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com')
      );
    }

    // Use `currentUser()` to get the Backend API User object
    const user = await currentUser();
    
    if (!user) {
      console.log('No user found in session');
      return NextResponse.redirect(
        new URL('/Intergrations?auth=error&message=' + encodeURIComponent('User not authenticated'), 
        process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com')
      );
    }

    console.log('User authenticated:', userId);
    console.log('User email:', user.emailAddresses?.[0]?.emailAddress);

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('Callback received - Code:', code ? 'Present' : 'Missing', 'Error:', error);

    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('Missing required environment variables');
      return NextResponse.redirect(
        new URL('/Intergrations?auth=error&message=' + encodeURIComponent('OAuth configuration is incomplete'), 
        process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com')
      );
    }

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com';

    // Handle OAuth error
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL('/Intergrations?auth=error&message=' + encodeURIComponent('OAuth failed'), baseUrl)
      );
    }

    // Handle missing authorization code
    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/Intergrations?auth=error&message=' + encodeURIComponent('No authorization code'), baseUrl)
      );
    }

    console.log('Attempting to exchange code for tokens...');
    console.log('Using client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Using redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      }),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    console.log('Tokens received:', Object.keys(tokens));
    console.log('Access token preview:', tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'null');

    // Validate required tokens
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing required tokens');
    }

    // Calculate expiry time
    const expiryTime = Date.now() + (tokens.expires_in * 1000);
    console.log('Token expires at:', new Date(expiryTime).toISOString());

    // Store tokens in database for persistent storage
    try {
      // Check if user exists in database, create if not
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      let actualUserId = userId;
      
      if (existingUser.length > 0) {
        actualUserId = existingUser[0].id;
        console.log('Found existing user:', actualUserId);
      } else {
        // Create new user using Clerk user info
        try {
          const userEmail = user.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
          
          const createdUser = await createUser({
            id: userId,
            email: userEmail,
            userLocalTime: new Date().toISOString(),
          });
          actualUserId = createdUser.id;
          console.log('Created new user:', actualUserId);
        } catch (createError) {
          console.error('Failed to create user:', createError);
          // Use the Clerk user ID if user creation fails
          actualUserId = userId;
        }
      }
      
      // Store OAuth tokens for this user
      await storeOAuthTokens(actualUserId, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        scope: tokens.scope,
        token_type: tokens.token_type,
      });
      
      console.log('OAuth tokens stored successfully in database for user:', actualUserId);
    } catch (dbError) {
      console.error('Failed to store tokens in database:', dbError);
      // Continue with cookie storage even if database storage fails
    }

    // Store tokens in cookies for immediate use
    const response = NextResponse.redirect(new URL('/Intergrations?auth=success', baseUrl));
    
    // Determine if we're in development or production
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = baseUrl.startsWith('https://');
    
    // Set cookies with appropriate security settings
    response.cookies.set('google_access_token', tokens.access_token, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });
    
    response.cookies.set('google_refresh_token', tokens.refresh_token, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    
    response.cookies.set('google_token_expiry', expiryTime.toString(), {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
      path: '/',
    });

    // Also store user ID in cookie for reference
    response.cookies.set('google_user_id', userId, {
      httpOnly: true,
      secure: isProduction && isSecure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    console.log('Tokens stored successfully in cookies');
    console.log(`Cookie settings: httpOnly=true, secure=${isProduction && isSecure}, sameSite=lax, path=/`);

    return response;
  } catch (error) {
    console.error('Error in callback:', error);
    return NextResponse.redirect(
      new URL('/Intergrations?auth=error&message=' + encodeURIComponent(error instanceof Error ? error.message : 'Unknown error'), 
      process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com')
    );
  }
}