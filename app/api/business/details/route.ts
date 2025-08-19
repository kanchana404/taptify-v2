import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token with automatic refresh
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const readMask = [
      'name', 'languageCode', 'storeCode', 'title', 'phoneNumbers', 'categories',
      'storefrontAddress', 'websiteUri', 'regularHours', 'specialHours', 'serviceArea',
      'labels', 'adWordsLocationExtensions', 'latlng', 'openInfo', 'metadata',
      'profile', 'relationshipData', 'moreHours', 'serviceItems'
    ].join(',');

    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?readMask=${readMask}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Google Business API Error:', errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Access token expired or invalid. Please reconnect your Google account.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch business details', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error) {
    console.error('Error fetching business details:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
