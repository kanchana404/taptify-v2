// app/api/business/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Post creation API called');
    
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
    const actionType = formData.get('actionType') as string;
    const actionUrl = formData.get('actionUrl') as string;
    const accountName = formData.get('accountName') as string;
    const locationName = formData.get('locationName') as string;
    const media = formData.get('media') as File;
    const eventTitle = formData.get('eventTitle') as string;
    const eventStartDate = formData.get('eventStartDate') as string;
    const eventEndDate = formData.get('eventEndDate') as string;
    const offerTitle = formData.get('offerTitle') as string;
    const offerTerms = formData.get('offerTerms') as string;
    
    // Valid post types and call-to-action types
    const validTopicTypes = ['STANDARD', 'EVENT', 'OFFER', 'ALERT'];
    const validActionTypes = ['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL'];
    
    // Debug logging
    console.log('Form data received:', {
      summary: summary?.substring(0, 50) + '...',
      topicType,
      actionType,
      hasActionUrl: !!actionUrl,
      hasMedia: !!media,
      eventTitle,
      eventStartDate,
      eventEndDate
    });

    // Debug logging - log ALL form data to see what's being sent
    console.log('ALL Form data received:');
    for (const [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }

    let s3MediaUrl: string | null = null;
    if (media) {
      // Upload to S3 first
      const arrayBuffer = await media.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // Dynamically import to avoid circular deps
      const { uploadToS3 } = await import('@/lib/s3');
      s3MediaUrl = await uploadToS3(buffer, media.name, media.type);
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

    // Validate and set topic type
    const finalTopicType = validTopicTypes.includes(topicType) ? topicType : 'STANDARD';
    console.log(`Original topicType: ${topicType}, Final topicType: ${finalTopicType}`);
    
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
      if ((actionType === 'LEARN_MORE' || actionType === 'SHOP' || actionType === 'BOOK' || actionType === 'ORDER' || actionType === 'SIGN_UP') && actionUrl) {
        postData.callToAction = {
          actionType: actionType,
          url: actionUrl
        };
      } else if (actionType === 'CALL') {
        // CALL action doesn't require URL
        postData.callToAction = {
          actionType: actionType
        };
      } else if (!actionUrl) {
        console.log(`${actionType} action type requires URL but none provided, skipping call to action`);
      }
    } else if (actionType) {
      console.log(`Invalid action type: ${actionType}, skipping call to action`);
    }

    // Attach S3 media URL to postData if present
    if (s3MediaUrl) {
      postData.media = [{
        mediaFormat: media.type.startsWith('video/') ? 'VIDEO' : 'PHOTO',
        sourceUrl: s3MediaUrl
      }];
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
        return NextResponse.json(
          { error: `Invalid post data: ${errorText}` },
          { status: 400 }
        );
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
    console.error('Post creation API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('Posts list API called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountName = searchParams.get('accountName');
    const locationName = searchParams.get('locationName');

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Account name and location name are required' },
        { status: 400 }
      );
    }

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

    console.log('Fetching posts for parent path:', parentPath);

    // Get posts using Google My Business v4 API
    const postsUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/localPosts`;
    
    const postsResponse = await fetch(postsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Posts list response status:', postsResponse.status);

    if (!postsResponse.ok) {
      const errorText = await postsResponse.text();
      console.error('Posts list error:', errorText);
      
      // If posts API fails with 404, the location might not have posts
      if (postsResponse.status === 404) {
        console.log('Posts not found for this location');
        return NextResponse.json({ 
          localPosts: [],
          total: 0,
          message: 'No posts found for this location'
        });
      }
      
      return NextResponse.json(
        { error: `Failed to fetch posts: ${postsResponse.status} - ${errorText}` },
        { status: postsResponse.status }
      );
    }

    const postsData = await postsResponse.json();
    console.log('Posts fetched successfully:', postsData);

    return NextResponse.json({ 
      localPosts: postsData.localPosts || [],
      total: postsData.localPosts?.length || 0 
    });

  } catch (error) {
    console.error('Posts list API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch posts', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('Post deletion API called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postName = searchParams.get('name');

    if (!postName) {
      return NextResponse.json(
        { error: 'Post name is required' },
        { status: 400 }
      );
    }

    console.log('Deleting post:', postName);

    // Delete the post using Google My Business v4 API
    const deleteUrl = `https://mybusiness.googleapis.com/v4/${postName}`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Post deletion response status:', deleteResponse.status);

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error('Post deletion error:', errorText);
      
      if (deleteResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      } else if (deleteResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to delete this post.' },
          { status: 403 }
        );
      } else if (deleteResponse.status === 404) {
        return NextResponse.json(
          { error: 'Post not found or already deleted.' },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { error: `Failed to delete post: ${deleteResponse.status} - ${errorText}` },
          { status: deleteResponse.status }
        );
      }
    }

    console.log('Post deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Post deletion API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    console.log('Post update API called');
    
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User not authenticated. Please login.' },
        { status: 401 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const postName = searchParams.get('name');
    const updateMask = searchParams.get('updateMask') || 'summary,callToAction';

    if (!postName) {
      return NextResponse.json(
        { error: 'Post name is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    console.log('Updating post:', postName, 'with data:', updateData);

    // Update the post using Google My Business v4 API
    const updateUrl = `https://mybusiness.googleapis.com/v4/${postName}?updateMask=${updateMask}`;
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    console.log('Post update response status:', updateResponse.status);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error('Post update error:', errorText);
      
      return NextResponse.json(
        { error: `Failed to update post: ${updateResponse.status} - ${errorText}` },
        { status: updateResponse.status }
      );
    }

    const updateResult = await updateResponse.json();
    console.log('Post updated successfully');

    return NextResponse.json({
      success: true,
      post: updateResult,
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('Post update API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update post', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}