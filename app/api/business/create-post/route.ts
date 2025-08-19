// app/api/business/create-post/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Create post API called');
    
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

    console.log('Access token found, processing post creation...');

    // Parse form data
    const formData = await request.formData();
    const summary = formData.get('summary') as string;
    const topicType = formData.get('topicType') as string || 'STANDARD';
    const actionType = formData.get('actionType') as string || 'LEARN_MORE';
    const actionUrl = formData.get('actionUrl') as string;
    const accountName = formData.get('accountName') as string;
    const locationName = formData.get('locationName') as string;
    const media = formData.get('media') as File;
    const aiImageUrl = formData.get('aiImageUrl') as string; // AI generated image URL
    const eventTitle = formData.get('eventTitle') as string;
    const eventStartDate = formData.get('eventStartDate') as string;
    const eventEndDate = formData.get('eventEndDate') as string;
    const offerTitle = formData.get('offerTitle') as string;
    const offerTerms = formData.get('offerTerms') as string;

    // Valid post types and call-to-action types
    const validTopicTypes = ['STANDARD', 'EVENT', 'OFFER', 'ALERT'];
    const validActionTypes = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'];

    // Validate image format if media is provided
    if (media) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'video/mp4', 'video/avi'];
      if (!allowedTypes.includes(media.type.toLowerCase())) {
        return NextResponse.json(
          { error: 'Unsupported file type. Only JPEG images and MP4/AVI videos are supported. PNG images are not supported by Google My Business.' },
          { status: 400 }
        );
      }
    }

    if (!summary) {
      return NextResponse.json(
        { error: 'Post summary is required' },
        { status: 400 }
      );
    }

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Account name and location name are required' },
        { status: 400 }
      );
    }

    console.log('Post creation details:', {
      summary: summary.substring(0, 50) + '...',
      topicType,
      actionType,
      hasActionUrl: !!actionUrl,
      hasMedia: !!media,
      accountName: accountName.substring(0, 20) + '...',
      locationName: locationName.substring(0, 20) + '...'
    });

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

    console.log('Parent path for post creation:', parentPath);

    // Prepare the post data
    const postData: any = {
      languageCode: 'en',
      summary: summary
    };

    // Handle different post types with proper validation
    const finalTopicType = validTopicTypes.includes(topicType) ? topicType : 'STANDARD';
    console.log(`Original topicType: ${topicType}, Final topicType: ${finalTopicType}`);

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
          console.log('EVENT type requested but missing event details, forcing to STANDARD');
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
          console.log('OFFER type requested but missing offer details, forcing to STANDARD');
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

    // Handle media upload - prioritize AI image, then manual upload
    let mediaAdded = false;
    
    // First, try to add AI-generated image if provided
    if (aiImageUrl && aiImageUrl.trim() !== '') {
      try {
        console.log('Adding AI-generated image to post:', aiImageUrl);
        postData.media = [{
          mediaFormat: 'PHOTO',
          sourceUrl: aiImageUrl.trim()
        }];
        mediaAdded = true;
        console.log('AI-generated image added to post');
      } catch (aiImageError) {
        console.warn('Failed to add AI-generated image:', aiImageError);
      }
    }
    
    // If no AI image was added and manual media is provided, upload it
    if (!mediaAdded && media) {
      console.log('Uploading manual media to S3 for post...');
      try {
        const arrayBuffer = await media.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const { uploadToS3 } = await import('@/lib/s3');
        const s3Url = await uploadToS3(buffer, media.name, media.type);
        postData.media = [{
          mediaFormat: media.type.startsWith('video/') ? 'VIDEO' : 'PHOTO',
          sourceUrl: s3Url
        }];
        console.log('S3 media URL for post:', s3Url);
        mediaAdded = true;
      } catch (mediaError) {
        console.warn('S3 media upload error, creating post without media:', mediaError);
      }
    }

    console.log('Final post data:', JSON.stringify(postData, null, 2));

    // Create the post using Google My Business v4 API
    const postUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/localPosts`;
    
    console.log('Creating post at URL:', postUrl);

    const postResponse = await fetch(postUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    console.log('Post creation response status:', postResponse.status);

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('Post creation error:', errorText);
      
      if (postResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      } else if (postResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to create posts.' },
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
    console.log('Post created successfully:', postResult);

    return NextResponse.json({
      success: true,
      post: postResult,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('Create post API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}