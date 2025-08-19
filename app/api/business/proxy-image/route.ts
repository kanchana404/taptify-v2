import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStoredOAuthTokens, isTokenExpired } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Proxy image request received');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get valid access token from cookies first, then database
    let accessToken: string | null = null;
    
    // First, try to get token from cookies (immediate access)
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('google_access_token')?.value;
    const tokenExpiry = cookieStore.get('google_token_expiry')?.value;
    
    if (cookieToken) {
      // Check if cookie token is expired
      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry);
        const currentTime = Date.now();
        
        if (currentTime < expiryTime) {
          console.log('Using valid token from cookies');
          accessToken = cookieToken;
        } else {
          console.log('Cookie token expired, checking database...');
        }
      } else {
        console.log('Using token from cookies (no expiry info)');
        accessToken = cookieToken;
      }
    }
    
    // If no valid cookie token, try database
    if (!accessToken) {
      console.log('Checking database for stored tokens...');
      try {
        const storedTokens = await getStoredOAuthTokens(userId);
        
        if (storedTokens && storedTokens.access_token) {
          // Check if database token is expired
          if (!isTokenExpired(storedTokens.expires_at)) {
            console.log('Using valid token from database for user:', userId);
            accessToken = storedTokens.access_token;
          } else {
            console.log('Database token expired');
          }
        }
      } catch (dbError) {
        console.error('Error checking database for tokens:', dbError);
      }
    }
    
    if (!accessToken) {
      console.log('No valid access token found in cookies or database');
      return NextResponse.json(
        { error: 'Google account not connected' },
        { status: 401 }
      );
    }

    // Get the image URL from query parameters
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      console.log('No image URL provided');
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    console.log('Proxying image URL:', imageUrl);
    console.log('Using access token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'null');

    // Fetch the image with the access token
    const imageResponse = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('Image response status:', imageResponse.status);
    console.log('Image response headers:', Object.fromEntries(imageResponse.headers.entries()));

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error('Failed to fetch image:', {
        status: imageResponse.status,
        statusText: imageResponse.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: 'Failed to fetch image' },
        { status: imageResponse.status }
      );
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    console.log('Image fetched successfully:', {
      size: imageBuffer.byteLength,
      contentType
    });

    // Return the image with proper headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error proxying image:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}