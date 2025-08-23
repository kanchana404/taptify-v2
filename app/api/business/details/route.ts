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

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get access token
    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { locationId, title, websiteUri, phoneNumbers, profile, categories, serviceItems } = body || {};

    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    // Build update mask based on provided fields
    const updateMaskParts: string[] = [];
    const payload: Record<string, any> = {};

    if (typeof title === 'string') {
      updateMaskParts.push('title');
      payload.title = title;
    }

    if (typeof websiteUri === 'string') {
      updateMaskParts.push('websiteUri');
      payload.websiteUri = websiteUri;
    }

    if (phoneNumbers && typeof phoneNumbers.primaryPhone === 'string') {
      updateMaskParts.push('phoneNumbers');
      payload.phoneNumbers = { primaryPhone: phoneNumbers.primaryPhone };
    }

    if (profile && typeof profile.description === 'string') {
      updateMaskParts.push('profile.description');
      payload.profile = { description: profile.description };
    }

    if (categories) {
      // Allow full categories or only primaryCategory via update mask
      if (categories.primaryCategory || categories.additionalCategories) {
        // If only primaryCategory specified and no additionalCategories key, allow specific mask
        if (categories.primaryCategory && !('additionalCategories' in categories)) {
          updateMaskParts.push('categories.primaryCategory');
        } else {
          updateMaskParts.push('categories');
        }
        payload.categories = categories;
      }
    }

    if (serviceItems) {
      updateMaskParts.push('serviceItems');
      payload.serviceItems = serviceItems;
    }

    if (updateMaskParts.length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided. Provide one of: title, websiteUri, phoneNumbers.primaryPhone, profile.description' },
        { status: 400 }
      );
    }

    const updateMask = updateMaskParts.join(',');
    const updateUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${locationId}?updateMask=${encodeURIComponent(updateMask)}`;

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      let message = 'Failed to update business details';
      try {
        const json = JSON.parse(errorText);
        if (json.error?.message) message = json.error.message;
      } catch {}
      return NextResponse.json(
        { error: message, status: updateResponse.status, details: errorText },
        { status: updateResponse.status }
      );
    }

    const data = await updateResponse.json();
    return NextResponse.json({ success: true, message: 'Business details updated successfully', data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}