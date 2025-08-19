// app/api/external-posts/offer/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('Offer post creation API called');
    
    // Parse JSON body
    const body = await request.json();
    
    // Extract data for OFFER posts
    const {
      title,
      offerTitle,
      offerTerms,
      imageUrl,
      videoUrl,
      actionType,
      actionUrl,
      accountName,
      locationName,
      userId
    } = body;

    // Validate required fields for OFFER posts
    if (!title) {
      return NextResponse.json(
        { error: 'Title is required for offer posts' },
        { status: 400 }
      );
    }

    if (!offerTitle) {
      return NextResponse.json(
        { error: 'Offer title is required for offer posts' },
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

    console.log('Access token found, processing offer post creation...');

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

    console.log('Parent path for offer post creation:', parentPath);

    // Prepare the post data for OFFER type
    const postData: any = {
      languageCode: 'en',
      summary: title,
      topicType: 'OFFER'
    };

    // Add offer data - try with couponCode and redeemOnlineUrl as per Google API
    postData.offer = {
      couponCode: offerTitle,
      redeemOnlineUrl: offerTerms || ''
    };

    // OFFER posts also need an event structure
    const now = new Date();
    const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    postData.event = {
      title: offerTitle,
      schedule: {
        startDate: {
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate()
        },
        startTime: {
          hours: 9,
          minutes: 0
        },
        endDate: {
          year: oneMonthLater.getFullYear(),
          month: oneMonthLater.getMonth() + 1,
          day: oneMonthLater.getDate()
        },
        endTime: {
          hours: 18,
          minutes: 0
        }
      }
    };

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
      console.log('Added image to offer post:', imageUrl.trim());
    } else if (videoUrl && videoUrl.trim() !== '') {
      postData.media = [{
        mediaFormat: 'VIDEO',
        sourceUrl: videoUrl.trim()
      }];
      console.log('Added video to offer post:', videoUrl.trim());
    }

    console.log('Final offer post data:', JSON.stringify(postData, null, 2));

    // Create the post using Google My Business v4 API
    const postUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/localPosts`;
    
    console.log('Creating offer post at URL:', postUrl);

    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    console.log('Offer post creation response status:', postResponse.status);

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('Google API error response:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to create offer post',
          details: errorText,
          status: postResponse.status
        },
        { status: postResponse.status }
      );
    }

    const postResult = await postResponse.json();
    console.log('Offer post created successfully:', postResult);

    return NextResponse.json({
      success: true,
      message: 'Offer post created successfully',
      post: postResult
    });

  } catch (error) {
    console.error('Error creating offer post:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 