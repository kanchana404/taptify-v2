// app/api/business/route.ts - Updated version with cookie-based token storage and Clerk authentication
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStoredOAuthTokens, isTokenExpired } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

async function getValidAccessToken(): Promise<string | null> {
  // First, try to get token from cookies (immediate access)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('google_access_token')?.value;
  const tokenExpiry = cookieStore.get('google_token_expiry')?.value;
  
  if (accessToken) {
    // Check if cookie token is expired
    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry);
      const currentTime = Date.now();
      
      if (currentTime >= expiryTime) {
        console.log('Cookie token expired, checking database...');
      } else {
        console.log('Using valid token from cookies');
        return accessToken;
      }
    } else {
      console.log('Using token from cookies (no expiry info)');
      return accessToken;
    }
  }
  
  // If no valid cookie token, try database
  console.log('Checking database for stored tokens...');
  try {
    // Get user ID from Clerk authentication
    const { userId } = await auth();
    
    if (userId) {
      const storedTokens = await getStoredOAuthTokens(userId);
      
      if (storedTokens && storedTokens.access_token) {
        // Check if database token is expired
        if (isTokenExpired(storedTokens.expires_at)) {
          console.log('Database token expired');
          return null;
        }
        
        console.log('Using valid token from database for user:', userId);
        return storedTokens.access_token;
      }
    } else {
      console.log('No authenticated user found, cannot check database');
    }
  } catch (dbError) {
    console.error('Error checking database for tokens:', dbError);
  }
  
  console.log('No valid tokens found in cookies or database');
  return null;
}

export async function GET(request: NextRequest) {
  try {
    console.log('Business API called');
    
    // Get valid access token from cookies
    const accessToken = await getValidAccessToken();
    
    if (!accessToken) {
      console.log('No valid access token found');
      return NextResponse.json(
        { error: 'Google account not connected. Please connect your Google Business Profile.' },
        { status: 401 }
      );
    }

    console.log('Access token found, making API calls...');

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const accountName = searchParams.get('accountName');
    const locationName = searchParams.get('locationName');

    console.log('Request type:', type, 'Account:', accountName, 'Location:', locationName);

    switch (type) {
      case 'debug':
        // Debug endpoint to check token info
        console.log('Debug: Checking token info...');
        
        const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);
        
        if (tokenInfoResponse.ok) {
          const tokenInfo = await tokenInfoResponse.json();
          console.log('Token info:', tokenInfo);
          
          return NextResponse.json({
            tokenInfo: tokenInfo,
            accessToken: accessToken ? `${accessToken.substring(0, 10)}...` : 'null',
            connectionStatus: 'connected'
          });
        } else {
          const errorText = await tokenInfoResponse.text();
          console.error('Token info error:', errorText);
          return NextResponse.json({
            error: 'Failed to get token info',
            status: tokenInfoResponse.status,
            details: errorText,
            connectionStatus: 'invalid_token'
          });
        }

      case 'accounts':
        console.log('Fetching business accounts...');
        
        // Try to get business accounts
        const accountsResponse = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Accounts API response status:', accountsResponse.status);

        if (!accountsResponse.ok) {
          const errorText = await accountsResponse.text();
          console.error('Accounts API error:', errorText);
          return NextResponse.json(
            { error: `Failed to fetch accounts: ${accountsResponse.status} - ${errorText}` },
            { status: accountsResponse.status }
          );
        }

        const accountsData = await accountsResponse.json();
        console.log('Accounts data:', accountsData);
        
        return NextResponse.json({ 
          accounts: accountsData.accounts || [],
          total: accountsData.accounts?.length || 0 
        });

      case 'locations':
        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for locations' },
            { status: 400 }
          );
        }

        console.log('Fetching locations for account:', accountName);
        
        // First, try the simple approach without read_mask
        let locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`;
        
        console.log('Trying locations URL without read_mask:', locationsUrl);
        
        let locationsResponse = await fetch(locationsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Locations API response status (no read_mask):', locationsResponse.status);

        // If that fails, try with minimal read_mask
        if (!locationsResponse.ok) {
          console.log('Trying with minimal read_mask...');
          locationsUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`;
          
          locationsResponse = await fetch(locationsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('Locations API response status (minimal read_mask):', locationsResponse.status);
        }

        // If that also fails, try the account management API
        if (!locationsResponse.ok) {
          console.log('Trying account management API...');
          locationsUrl = `https://mybusinessaccountmanagement.googleapis.com/v1/${accountName}/locations`;
          
          locationsResponse = await fetch(locationsUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('Account management API response status:', locationsResponse.status);
        }

        if (!locationsResponse.ok) {
          const errorText = await locationsResponse.text();
          console.error('All locations API attempts failed:', errorText);
          return NextResponse.json(
            { error: `Failed to fetch locations: ${locationsResponse.status} - ${errorText}` },
            { status: locationsResponse.status }
          );
        }

        const locationsData = await locationsResponse.json();
        console.log('Locations data:', locationsData);
        
        return NextResponse.json({ 
          locations: locationsData.locations || [],
          total: locationsData.locations?.length || 0 
        });

      case 'reviews':
        if (!locationName) {
          return NextResponse.json(
            { error: 'locationName is required for reviews' },
            { status: 400 }
          );
        }

        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for reviews' },
            { status: 400 }
          );
        }

        console.log('Fetching reviews for location:', locationName);
        
        // Construct the parent path for v4 API: accounts/*/locations/*
        let parentPath;
        
        // Handle different input formats
        if (locationName.includes('accounts/') && locationName.includes('locations/')) {
          // locationName is already a full path like "accounts/123/locations/456"
          parentPath = locationName;
        } else if (locationName.startsWith('locations/')) {
          // locationName is like "locations/456", combine with accountName
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          parentPath = `${cleanAccountName}/${locationName}`;
        } else {
          // locationName is just an ID like "456"
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          parentPath = `${cleanAccountName}/locations/${locationName}`;
        }
        
        console.log('Parent path for v4 reviews API:', parentPath);
        
        // Use Google My Business v4 API for reviews
        const reviewsUrl = `https://mybusiness.googleapis.com/v4/${parentPath}/reviews`;
        
        console.log('Reviews URL (v4 API):', reviewsUrl);
        
        const reviewsResponse = await fetch(reviewsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Reviews API response status:', reviewsResponse.status);

        if (!reviewsResponse.ok) {
          const errorText = await reviewsResponse.text();
          console.error('Reviews API error:', errorText);
          console.error('Reviews API response headers:', Object.fromEntries(reviewsResponse.headers.entries()));
          
          // If reviews API fails with 404, the location might not have reviews or reviews access is restricted
          if (reviewsResponse.status === 404) {
            console.log('Reviews not found for this location');
            return NextResponse.json({ 
              reviews: [],
              total: 0,
              message: 'No reviews found for this location or reviews access may be restricted'
            });
          }
          
          // If 403, access is forbidden
          if (reviewsResponse.status === 403) {
            console.log('Reviews access forbidden for this location');
            return NextResponse.json({ 
              reviews: [],
              total: 0,
              message: 'Reviews access is restricted for this location'
            });
          }
          
          // If 401, authentication issue - token might need refresh
          if (reviewsResponse.status === 401) {
            console.log('Authentication failed for reviews - token may need refresh');
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          }
          
          return NextResponse.json(
            { 
              error: `Failed to fetch reviews: ${reviewsResponse.status} - ${errorText}`,
              url: reviewsUrl,
              parentPath: parentPath
            },
            { status: reviewsResponse.status }
          );
        }

        const reviewsData = await reviewsResponse.json();
        console.log('Reviews data:', reviewsData);
        
        return NextResponse.json({ 
          reviews: reviewsData.reviews || [],
          total: reviewsData.reviews?.length || 0,
          parentPath: parentPath,
          url: reviewsUrl
        });

      case 'posts':
        if (!locationName) {
          return NextResponse.json(
            { error: 'locationName is required for posts' },
            { status: 400 }
          );
        }

        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for posts' },
            { status: 400 }
          );
        }

        console.log('Fetching posts for location:', locationName);
        
        // Construct the parent path for v4 API: accounts/*/locations/*
        let postsParentPath;
        
        // Handle different input formats
        if (locationName.includes('accounts/') && locationName.includes('locations/')) {
          // locationName is already a full path like "accounts/123/locations/456"
          postsParentPath = locationName;
        } else if (locationName.startsWith('locations/')) {
          // locationName is like "locations/456", combine with accountName
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          postsParentPath = `${cleanAccountName}/${locationName}`;
        } else {
          // locationName is just an ID like "456"
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          postsParentPath = `${cleanAccountName}/locations/${locationName}`;
        }
        
        console.log('Parent path for v4 posts API:', postsParentPath);
        
        // Use Google My Business v4 API for posts
        const postsUrl = `https://mybusiness.googleapis.com/v4/${postsParentPath}/localPosts`;
        
        console.log('Posts URL (v4 API):', postsUrl);
        
        const postsResponse = await fetch(postsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Posts API response status:', postsResponse.status);

        if (!postsResponse.ok) {
          const errorText = await postsResponse.text();
          console.error('Posts API error:', errorText);
          console.error('Posts API response headers:', Object.fromEntries(postsResponse.headers.entries()));
          
          // If posts API fails with 404, the location might not have posts or posts access is restricted
          if (postsResponse.status === 404) {
            console.log('Posts not found for this location');
            return NextResponse.json({ 
              posts: [],
              total: 0,
              message: 'No posts found for this location or posts access may be restricted'
            });
          }
          
          // If 403, access is forbidden
          if (postsResponse.status === 403) {
            console.log('Posts access forbidden for this location');
            return NextResponse.json({ 
              posts: [],
              total: 0,
              message: 'Posts access is restricted for this location'
            });
          }
          
          // If 401, authentication issue - token might need refresh
          if (postsResponse.status === 401) {
            console.log('Authentication failed for posts - token may need refresh');
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          }
          
          return NextResponse.json(
            { 
              error: `Failed to fetch posts: ${postsResponse.status} - ${errorText}`,
              url: postsUrl,
              parentPath: postsParentPath
            },
            { status: postsResponse.status }
          );
        }

        const postsData = await postsResponse.json();
        console.log('Posts data:', postsData);
        
        return NextResponse.json({ 
          posts: postsData.localPosts || [],
          total: postsData.localPosts?.length || 0,
          parentPath: postsParentPath,
          url: postsUrl
        });

      case 'analytics':
        if (!locationName) {
          return NextResponse.json(
            { error: 'locationName is required for analytics' },
            { status: 400 }
          );
        }

        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for analytics' },
            { status: 400 }
          );
        }

        console.log('Fetching analytics for location:', locationName);
        
        // Construct the parent path for v4 API: accounts/*/locations/*
        let analyticsParentPath;
        
        // Handle different input formats
        if (locationName.includes('accounts/') && locationName.includes('locations/')) {
          // locationName is already a full path like "accounts/123/locations/456"
          analyticsParentPath = locationName;
        } else if (locationName.startsWith('locations/')) {
          // locationName is like "locations/456", combine with accountName
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          analyticsParentPath = `${cleanAccountName}/${locationName}`;
        } else {
          // locationName is just an ID like "456"
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          analyticsParentPath = `${cleanAccountName}/locations/${locationName}`;
        }
        
        console.log('Parent path for v4 analytics API:', analyticsParentPath);
        
        // Use Google My Business v4 API for analytics
        const analyticsUrl = `https://mybusiness.googleapis.com/v4/${analyticsParentPath}/reportInsights`;
        
        console.log('Analytics URL (v4 API):', analyticsUrl);
        
        const analyticsResponse = await fetch(analyticsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Analytics API response status:', analyticsResponse.status);

        if (!analyticsResponse.ok) {
          const errorText = await analyticsResponse.text();
          console.error('Analytics API error:', errorText);
          console.error('Analytics API response headers:', Object.fromEntries(analyticsResponse.headers.entries()));
          
          // If analytics API fails with 404, the location might not have analytics or analytics access is restricted
          if (analyticsResponse.status === 404) {
            console.log('Analytics not found for this location');
            return NextResponse.json({ 
              analytics: null,
              message: 'No analytics found for this location or analytics access may be restricted'
            });
          }
          
          // If 403, access is forbidden
          if (analyticsResponse.status === 403) {
            console.log('Analytics access forbidden for this location');
            return NextResponse.json({ 
              analytics: null,
              message: 'Analytics access is restricted for this location'
            });
          }
          
          // If 401, authentication issue - token might need refresh
          if (analyticsResponse.status === 401) {
            console.log('Authentication failed for analytics - token may need refresh');
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          }
          
          return NextResponse.json(
            { 
              error: `Failed to fetch analytics: ${analyticsResponse.status} - ${errorText}`,
              url: analyticsUrl,
              parentPath: analyticsParentPath
            },
            { status: analyticsResponse.status }
          );
        }

        const analyticsData = await analyticsResponse.json();
        console.log('Analytics data:', analyticsData);
        
        return NextResponse.json({ 
          analytics: analyticsData,
          parentPath: analyticsParentPath,
          url: analyticsUrl
        });

      case 'photos':
        if (!locationName) {
          return NextResponse.json(
            { error: 'locationName is required for photos' },
            { status: 400 }
          );
        }

        if (!accountName) {
          return NextResponse.json(
            { error: 'accountName is required for photos' },
            { status: 400 }
          );
        }

        console.log('Fetching photos for location:', locationName);
        
        // Construct the parent path for v4 API: accounts/*/locations/*
        let photosParentPath;
        
        // Handle different input formats
        if (locationName.includes('accounts/') && locationName.includes('locations/')) {
          // locationName is already a full path like "accounts/123/locations/456"
          photosParentPath = locationName;
        } else if (locationName.startsWith('locations/')) {
          // locationName is like "locations/456", combine with accountName
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          photosParentPath = `${cleanAccountName}/${locationName}`;
        } else {
          // locationName is just an ID like "456"
          const cleanAccountName = accountName.startsWith('accounts/') ? accountName : `accounts/${accountName}`;
          photosParentPath = `${cleanAccountName}/locations/${locationName}`;
        }
        
        console.log('Parent path for v4 photos API:', photosParentPath);
        
        // Use Google My Business v4 API for photos - first get the media list
        const mediaListUrl = `https://mybusiness.googleapis.com/v4/${photosParentPath}/media`;
        
        console.log('Media list URL (v4 API):', mediaListUrl);
        
        const mediaListResponse = await fetch(mediaListUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Media list API response status:', mediaListResponse.status);
        console.log('Media list API response headers:', Object.fromEntries(mediaListResponse.headers.entries()));

        if (!mediaListResponse.ok) {
          const errorText = await mediaListResponse.text();
          console.error('Media list API error:', errorText);
          console.error('Media list API response headers:', Object.fromEntries(mediaListResponse.headers.entries()));
          
          // If media list API fails with 404, the location might not have media or media access is restricted
          if (mediaListResponse.status === 404) {
            console.log('Media not found for this location');
            return NextResponse.json({ 
              photos: [],
              total: 0,
              message: 'No media found for this location or media access may be restricted'
            });
          }
          
          // If 403, access is forbidden
          if (mediaListResponse.status === 403) {
            console.log('Media access forbidden for this location');
            return NextResponse.json({ 
              photos: [],
              total: 0,
              message: 'Media access is restricted for this location'
            });
          }
          
          // If 401, authentication issue - token might need refresh
          if (mediaListResponse.status === 401) {
            console.log('Authentication failed for media list - token may need refresh');
            return NextResponse.json(
              { error: 'Authentication failed. Please reconnect your Google account.' },
              { status: 401 }
            );
          }
          
          return NextResponse.json(
            { 
              error: `Failed to fetch media list: ${mediaListResponse.status} - ${errorText}`,
              url: mediaListUrl,
              parentPath: photosParentPath
            },
            { status: mediaListResponse.status }
          );
        }

        const mediaListData = await mediaListResponse.json();
        console.log('Media list data:', mediaListData);
        
        // Check for different possible response structures
        const mediaItems = mediaListData.mediaItems || mediaListData.media || [];
        const totalCount = mediaListData.totalMediaItemCount || mediaListData.total || mediaItems.length;
        
        console.log('Media list data structure:', {
          hasMediaItems: !!mediaListData.mediaItems,
          hasMedia: !!mediaListData.media,
          mediaItemsLength: mediaListData.mediaItems?.length || 0,
          mediaLength: mediaListData.media?.length || 0,
          actualMediaItems: mediaItems.length,
          mediaKeys: mediaItems[0] ? Object.keys(mediaItems[0]) : [],
          sampleMedia: mediaItems[0] || null,
          totalMediaItemCount: totalCount,
          nextPageToken: mediaListData.nextPageToken || null,
          responseKeys: Object.keys(mediaListData)
        });
        
        // Log the first few media items to see their structure
        if (mediaItems.length > 0) {
          console.log('Sample media items:');
          mediaItems.slice(0, 3).forEach((item: any, index: number) => {
            console.log(`Media item ${index + 1}:`, {
              name: item.name,
              sourceUrl: item.sourceUrl,
              googleUrl: item.googleUrl,
              thumbnailUrl: item.thumbnailUrl,
              mediaFormat: item.mediaFormat,
              category: item.locationAssociation?.category
            });
          });
        }

        // If no media items, return empty array
        if (mediaItems.length === 0) {
          console.log('No media items found');
          return NextResponse.json({ 
            photos: [],
            total: 0,
            parentPath: photosParentPath,
            url: mediaListUrl
          });
        }

        // The media list API already returns the full media data, no need for individual calls
        console.log('Using media data directly from list API');
        
        // Map the Google My Business API response to our expected format
        const mappedPhotos = mediaItems.map((photo: any) => ({
          name: photo.name || '',
          mediaFormat: photo.mediaFormat || 'PHOTO',
          sourceUrl: photo.sourceUrl || photo.googleUrl || '', // Use sourceUrl first as it's the direct image URL
          googleUrl: photo.googleUrl || '',
          thumbnailUrl: photo.thumbnailUrl || photo.sourceUrl || photo.googleUrl || '', // Use sourceUrl as fallback for thumbnail
          createTime: photo.createTime || '',
          updateTime: photo.updateTime || '',
          mediaItemDataRef: photo.mediaItemDataRef || null,
          locationAssociation: photo.locationAssociation || { category: 'PROFILE' },
          attribution: photo.attribution || null,
          description: photo.description || '',
          dimensions: photo.dimensions || null,
          createTimeFormatted: photo.createTime ? new Date(photo.createTime).toLocaleDateString() : '',
          mediaId: photo.name ? photo.name.split('/').pop() : ''
        }));
        
        console.log('Mapped photos:', mappedPhotos);
        
        // Log the first few mapped photos to see the final structure
        if (mappedPhotos.length > 0) {
          console.log('Sample mapped photos:');
          mappedPhotos.slice(0, 3).forEach((photo: any, index: number) => {
            console.log(`Mapped photo ${index + 1}:`, {
              mediaId: photo.mediaId,
              sourceUrl: photo.sourceUrl,
              googleUrl: photo.googleUrl,
              thumbnailUrl: photo.thumbnailUrl,
              category: photo.locationAssociation?.category,
              dimensions: photo.dimensions
            });
          });
        }
        
        console.log('Final response summary:', {
          totalPhotos: mappedPhotos.length,
          hasPhotos: mappedPhotos.length > 0,
          firstPhotoSourceUrl: mappedPhotos[0]?.sourceUrl || 'none',
          firstPhotoGoogleUrl: mappedPhotos[0]?.googleUrl || 'none'
        });
        
        return NextResponse.json({ 
          photos: mappedPhotos,
          total: mappedPhotos.length,
          parentPath: photosParentPath,
          url: mediaListUrl
        });

      case 'connection-status':
        // Check connection status
        const hasConnection = !!(await getValidAccessToken());
        return NextResponse.json({
          connected: hasConnection
        });

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Use: debug, accounts, locations, reviews, posts, analytics, photos, or connection-status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Business API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch business data', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}