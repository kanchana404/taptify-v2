import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    console.log('Get Business Media API called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      console.log('No user ID found in session');
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    console.log('Access token found, fetching business media...');

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const accountName = searchParams.get('accountName');
    const locationName = searchParams.get('locationName');

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Both accountName and locationName are required' },
        { status: 400 }
      );
    }

    // Construct the resource name for the location
    let resourceName;
    if (locationName.includes('accounts/') && locationName.includes('locations/')) {
      resourceName = locationName;
    } else if (locationName.startsWith('locations/')) {
      const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
      resourceName = `${cleanAccountName}/${locationName}`;
    } else {
      const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
      resourceName = `${cleanAccountName}/locations/${locationName}`;
    }

    console.log('Fetching media for resource:', resourceName);

    // Fetch media from Google My Business API
    const mediaUrl = `https://mybusiness.googleapis.com/v4/${resourceName}/media`;
    
    const mediaResponse = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Media API response status:', mediaResponse.status);

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text();
      console.error('Media API error:', errorText);
      
      // Try to parse error for better user feedback
      let errorMessage = 'Failed to fetch business media';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use default error message if parsing fails
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: mediaResponse.status,
          details: errorText 
        },
        { status: mediaResponse.status }
      );
    }

    const mediaData = await mediaResponse.json();
    console.log('Media data retrieved successfully:', {
      mediaCount: mediaData.mediaItems?.length || 0,
      resourceName
    });

    // Transform the data to include more useful information
    const transformedMediaItems = mediaData.mediaItems?.map((item: any) => ({
      name: item.name,
      sourceUrl: item.sourceUrl,
      mediaFormat: item.mediaFormat,
      locationAssociation: item.locationAssociation,
      googleUrl: item.googleUrl,
      thumbnailUrl: item.thumbnailUrl,
      createTime: item.createTime,
      dimensions: item.dimensions,
      // Add formatted date for easier display
      createTimeFormatted: item.createTime ? new Date(item.createTime).toLocaleDateString() : null,
      // Extract media ID from name for easier reference
      mediaId: item.name ? item.name.split('/').pop() : null
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        mediaItems: transformedMediaItems,
        totalCount: transformedMediaItems.length,
        resourceName,
        fetchedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Unexpected error in get-media API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error occurred while fetching business media',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}