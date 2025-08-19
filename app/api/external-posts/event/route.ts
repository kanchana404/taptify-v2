// app/api/external-posts/event/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('Event post creation API called');
    
    // Parse JSON body
    const body = await request.json();
    
    // Extract data for EVENT posts
    const {
      title,
      eventTitle,
      eventStartDate,
      eventEndDate,
      imageUrl,
      videoUrl,
      actionType,
      actionUrl,
      accountName,
      locationName,
      userId
    } = body;

    // Validate required fields for EVENT posts
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required for event posts' },
        { status: 400 }
      );
    }

    if (!eventTitle) {
      return NextResponse.json(
        { error: 'Event title is required for event posts' },
        { status: 400 }
      );
    }

    if (!eventStartDate) {
      return NextResponse.json(
        { error: 'Event start date is required for event posts' },
        { status: 400 }
      );
    }

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Account name and location name are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required to access Google Business account' },
        { status: 400 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected for the specified user' },
        { status: 401 }
      );
    }

    console.log('Access token found, processing event post creation...');

    // Valid call-to-action types
    const validActionTypes = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'];

    // Construct the parent path for the location
    let parentPath;
    if (locationName.includes('accounts/') && locationName.includes('locations/')) {
      parentPath = locationName;
    } else if (locationName.startsWith('locations/')) {
      const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
      parentPath = `${cleanAccountName}/${locationName}`;
    } else {
      const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
      parentPath = `${cleanAccountName}/locations/${locationName}`;
    }

    console.log('Parent path for event post creation:', parentPath);

    // Prepare the post data for EVENT type
    const postData: any = {
      languageCode: 'en',
      summary: title,
      topicType: 'EVENT'
    };

    // Add event data
    const startDate = new Date(eventStartDate);
    postData.event = {
      title: eventTitle,
      schedule: {
        startDate: {
          year: startDate.getFullYear(),
          month: startDate.getMonth() + 1,
          day: startDate.getDate()
        },
        startTime: {
          hours: startDate.getHours() || 10,
          minutes: startDate.getMinutes() || 0
        }
      }
    };
    
    // Add end date if provided
    if (eventEndDate) {
      const endDate = new Date(eventEndDate);
      postData.event.schedule.endDate = {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1,
        day: endDate.getDate()
      };
      postData.event.schedule.endTime = {
        hours: endDate.getHours() || 18,
        minutes: endDate.getMinutes() || 0
      };
    }

    // Add call to action if provided and valid
    if (actionType && validActionTypes.includes(actionType)) {
      if ((actionType === 'LEARN_MORE' || actionType === 'SHOP' || actionType === 'BOOK' || actionType === 'ORDER' || actionType === 'SIGN_UP') && actionUrl && actionUrl.trim() !== '') {
        postData.callToAction = {
          actionType: actionType,
          url: actionUrl.trim()
        };
        console.log('Added call to action with URL:', actionUrl.trim());
      } else if (actionType === 'CALL') {
        // CALL action doesn't require URL
        postData.callToAction = {
          actionType: actionType
        };
        console.log('Added CALL action without URL');
      } else if (!actionUrl || actionUrl.trim() === '') {
        console.log(`${actionType} action type requires URL but none provided, skipping call to action`);
      }
    } else if (actionType) {
      console.log(`Invalid action type: ${actionType}, skipping call to action`);
    }

    // Handle media (image or video)
    if (imageUrl && imageUrl.trim() !== '') {
      postData.media = [{
        mediaFormat: 'PHOTO',
        sourceUrl: imageUrl.trim()
      }];
      console.log('Added image to event post:', imageUrl.trim());
    } else if (videoUrl && videoUrl.trim() !== '') {
      postData.media = [{
        mediaFormat: 'VIDEO',
        sourceUrl: videoUrl.trim()
      }];
      console.log('Added video to event post:', videoUrl.trim());
    }

    console.log('Final event post data:', JSON.stringify(postData, null, 2));

    // Create the post using Google My Business v4 API
    const postUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/localPosts`;
    
    console.log('Creating event post at URL:', postUrl);

    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    console.log('Event post creation response status:', postResponse.status);

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('Google API error response:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to create event post',
          details: errorText,
          status: postResponse.status
        },
        { status: postResponse.status }
      );
    }

    const postResult = await postResponse.json();
    console.log('Event post created successfully:', postResult);

    return NextResponse.json({
      success: true,
      message: 'Event post created successfully',
      post: postResult
    });

  } catch (error) {
    console.error('Error creating event post:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 