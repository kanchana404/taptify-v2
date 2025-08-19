import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    console.log('Google Business Reply API PUT called');

    // Get valid access token
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      console.log('No valid access token found');
      return NextResponse.json(
        { error: 'Authentication required. Please login again.' },
        { status: 401 }
      );
    }

    console.log('Access token found for PUT request');

    const body = await request.json();
    const { reviewId, comment, accountName, locationName } = body;

    console.log('PUT Request:', {
      reviewId,
      accountName,
      locationName,
      comment: comment ? `${comment.substring(0, 50)}...` : 'null',
    });

    // Validate required fields
    if (!reviewId || !comment || !accountName || !locationName) {
      return NextResponse.json(
        { error: 'Review ID, comment, account name, and location name are required' },
        { status: 400 }
      );
    }

    // Extract account and location IDs from the names
    const accountId = accountName.split('/').pop() || '';
    const locationId = locationName.split('/').pop() || '';

    if (!accountId || !locationId) {
      return NextResponse.json(
        { error: 'Invalid account or location name format' },
        { status: 400 }
      );
    }

    // Construct the review path for the Google API
    const reviewPath = `accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`;
    console.log('Review path for reply:', reviewPath);

    // Prepare the reply data
    const replyData = {
      comment: comment,
    };

    // Make the API call to Google My Business v4 API to update/create reply
    const replyResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${reviewPath}/reply`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(replyData),
      }
    );

    console.log('Reply API response status:', replyResponse.status);

    if (!replyResponse.ok) {
      const errorText = await replyResponse.text();
      console.error('Reply API error:', errorText);

      if (replyResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      } else if (replyResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to reply to this review.' },
          { status: 403 }
        );
      } else if (replyResponse.status === 404) {
        return NextResponse.json(
          { error: 'Review not found or location not verified.' },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: `Failed to send reply: ${replyResponse.status} - ${errorText}` },
          { status: replyResponse.status }
        );
      }
    }

    const replyResult = await replyResponse.json();
    console.log('Reply sent successfully to Google Business');

    return NextResponse.json({
      success: true,
      reply: replyResult,
      message: 'Reply sent successfully to Google Business',
    });
  } catch (error) {
    console.error('Google Business Reply API PUT Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('Google Business Reply API DELETE called');

    // Get valid access token
    const accessToken = await getValidAccessToken();

    if (!accessToken) {
      console.log('No valid access token found');
      return NextResponse.json(
        { error: 'Authentication required. Please login again.' },
        { status: 401 }
      );
    }

    console.log('Access token found for DELETE request');

    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');
    const accountName = searchParams.get('accountName');
    const locationName = searchParams.get('locationName');

    console.log('DELETE Request:', { reviewId, accountName, locationName });

    // Validate required fields
    if (!reviewId || !accountName || !locationName) {
      return NextResponse.json(
        { error: 'Review ID, account name, and location name are required' },
        { status: 400 }
      );
    }

    // Extract account and location IDs from the names
    const accountId = accountName.split('/').pop() || '';
    const locationId = locationName.split('/').pop() || '';

    if (!accountId || !locationId) {
      return NextResponse.json(
        { error: 'Invalid account or location name format' },
        { status: 400 }
      );
    }

    // Construct the review path for the Google API
    const reviewPath = `accounts/${accountId}/locations/${locationId}/reviews/${reviewId}`;
    console.log('Review path for delete reply:', reviewPath);

    // Make the API call to Google My Business v4 API to delete reply
    const deleteResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${reviewPath}/reply`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Delete Reply API response status:', deleteResponse.status);

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Delete Reply API error:', errorText);

      if (deleteResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      } else if (deleteResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to delete this reply.' },
          { status: 403 }
        );
      } else if (deleteResponse.status === 404) {
        return NextResponse.json(
          { error: 'Reply not found or review does not exist.' },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: `Failed to delete reply: ${deleteResponse.status} - ${errorText}` },
          { status: deleteResponse.status }
        );
      }
    }

    console.log('Reply deleted successfully from Google Business');

    return NextResponse.json({
      success: true,
      message: 'Reply deleted successfully from Google Business',
    });
  } catch (error) {
    console.error('Google Business Reply API DELETE Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}