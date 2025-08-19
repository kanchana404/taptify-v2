// app/api/external-posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('External post creation API called');
    
    // Parse JSON body instead of form data for external API
    const body = await request.json();
    
    // Extract data from request body
    const {
      title,
      type = 'STANDARD',
      imageUrl,
      videoUrl,
      actionType,
      actionUrl,
      eventTitle,
      eventStartDate,
      eventEndDate,
      offerTitle,
      offerTerms,
      accountName,
      locationName,
      userId // Optional: if you want to specify which user's account to use
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
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

    // API key validation removed - no authentication required for external API

    // User ID is required to get the access token
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required to access Google Business account' },
        { status: 400 }
      );
    }

    const targetUserId = userId;

    // Get valid access token from database
    const accessToken = await getValidAccessToken(targetUserId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', targetUserId);
      return NextResponse.json(
        { error: 'Google account not connected for the specified user' },
        { status: 401 }
      );
    }

    console.log('Access token found, processing external post creation...');

    // Valid post types and call-to-action types
    const validTopicTypes = ['STANDARD', 'EVENT', 'OFFER', 'ALERT'];
    const validActionTypes = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'];

    // Validate topic type
    const finalTopicType = validTopicTypes.includes(type) ? type : 'STANDARD';

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

    console.log('Parent path for external post creation:', parentPath);

    // Prepare the post data
    const postData: any = {
      languageCode: 'en',
      summary: title
    };

    // Handle different post types
    switch (finalTopicType) {
      case 'EVENT':
        if (eventTitle && eventStartDate) {
          postData.topicType = 'EVENT';
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
        } else {
          console.log('EVENT type requested but missing event details, using STANDARD');
          postData.topicType = 'STANDARD';
        }
        break;
        
      case 'OFFER':
        if (offerTitle) {
          postData.topicType = 'OFFER';
          postData.offer = {
            title: offerTitle,
            terms: offerTerms || ''
          };
        } else {
          console.log('OFFER type requested but missing offer details, using STANDARD');
          postData.topicType = 'STANDARD';
        }
        break;
        
      case 'ALERT':
        postData.topicType = 'ALERT';
        postData.alertType = 'COVID_19'; // Default alert type
        break;
        
      default:
        postData.topicType = 'STANDARD';
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
      console.log('Added image to post:', imageUrl.trim());
    } else if (videoUrl && videoUrl.trim() !== '') {
      postData.media = [{
        mediaFormat: 'VIDEO',
        sourceUrl: videoUrl.trim()
      }];
      console.log('Added video to post:', videoUrl.trim());
    }

    console.log('Final external post data:', JSON.stringify(postData, null, 2));

    // Create the post using Google My Business v4 API
    const postUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/localPosts`;
    
    console.log('Creating external post at URL:', postUrl);

    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    console.log('External post creation response status:', postResponse.status);

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('External post creation error:', errorText);
      
      if (postResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check the user account connection.' },
          { status: 401 }
        );
      } else if (postResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create posts for this account.' },
          { status: 403 }
        );
      } else if (postResponse.status === 400) {
        // Parse the error to provide more helpful feedback
        try {
          const errorObj = JSON.parse(errorText);
          const errorDetails = errorObj.error?.details?.[0]?.errorDetails?.[0];
          if (errorDetails?.field === 'call_to_action.url') {
            return NextResponse.json(
              { error: 'Call to action requires a valid URL. Please provide a URL or remove the call to action.' },
              { status: 400 }
            );
          }
          return NextResponse.json(
            { error: `Invalid post data: ${errorObj.error?.message || errorText}` },
            { status: 400 }
          );
        } catch {
          return NextResponse.json(
            { error: `Invalid post data: ${errorText}` },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: `Failed to create post: ${postResponse.status} - ${errorText}` },
          { status: postResponse.status }
        );
      }
    }

    const postResult = await postResponse.json();
    console.log('External post created successfully:', postResult);

    return NextResponse.json({
      success: true,
      post: postResult,
      message: 'Post created successfully via external API',
      postId: postResult.name,
      postUrl: postResult.searchUrl
    });

  } catch (error) {
    console.error('External post creation API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create post via external API', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method to check API status
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'External Posts API is running',
    version: '1.0.0',
    endpoints: {
      POST: '/api/external-posts - Create a new Google Business post',
      GET: '/api/external-posts - Check API status'
    },
    requiredFields: ['title', 'accountName', 'locationName', 'userId'],
    optionalFields: ['type', 'imageUrl', 'videoUrl', 'actionType', 'actionUrl', 'eventTitle', 'eventStartDate', 'eventEndDate', 'offerTitle', 'offerTerms']
  });
} 