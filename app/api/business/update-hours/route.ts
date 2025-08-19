import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(request: NextRequest) {
  try {
    console.log('Update hours API called');
    
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

    // Get request body
    const body = await request.json();
    const { locationId, regularHours } = body;

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    if (!regularHours || !regularHours.periods) {
      return NextResponse.json(
        { error: 'Regular hours with periods are required' },
        { status: 400 }
      );
    }

    console.log('Updating hours for location:', locationId);
    console.log('New hours:', regularHours);

    // Construct the location resource name
    const locationResourceName = `locations/${locationId}`;
    
    // Update hours using Google My Business API
    const updateUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${locationResourceName}?updateMask=regularHours`;
    
    console.log('Update URL:', updateUrl);
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        regularHours: regularHours
      }),
    });

    console.log('Update response status:', updateResponse.status);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Update hours API error:', errorText);
      
      // Try to parse error for better user feedback
      let errorMessage = 'Failed to update opening hours';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (e) {
        // Use default error message if parsing fails
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          status: updateResponse.status,
          details: errorText 
        },
        { status: updateResponse.status }
      );
    }

    const updatedData = await updateResponse.json();
    console.log('Hours updated successfully:', updatedData);
    
    return NextResponse.json({
      success: true,
      message: 'Opening hours updated successfully',
      data: updatedData
    });

  } catch (error) {
    console.error('Unexpected error in update-hours API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error occurred while updating opening hours',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}