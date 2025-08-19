// app/api/auth/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { currentUser, auth } from '@clerk/nextjs/server';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
  try {
    // Use `auth()` to get the user's ID
    const { userId } = await auth();

    // Protect the route by checking if the user is signed in
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use `currentUser()` to get the Backend API User object
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    console.log('Starting OAuth flow for user:', userId);
    console.log('User email:', user.emailAddresses?.[0]?.emailAddress);
    
    // Validate required environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      console.error('Missing required environment variables');
      return NextResponse.json(
        { error: 'OAuth configuration is incomplete' },
        { status: 500 }
      );
    }
    
    // Define the scopes for Google Business Profile
    const scopes = [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/places',
      'https://www.googleapis.com/auth/business.readonly',
    ];

    // Generate the OAuth authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to get refresh token
      include_granted_scopes: true,
      state: userId, // Pass the user ID in state parameter
    });

    console.log('Generated auth URL for user:', userId);

    // Return the URL instead of redirecting
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication URL' },
      { status: 500 }
    );
  }
}