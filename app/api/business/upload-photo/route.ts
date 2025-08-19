// app/api/business/upload-photo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Photo upload API called');
    
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

    console.log('Access token found, processing photo upload...');

    // Parse form data
    const formData = await request.formData();
    const sourceUrl = formData.get('sourceUrl') as string | null;
    const file = formData.get('file') as File | null;
    // Only allow valid Google My Business categories. Default to 'PROFILE' if not provided or invalid.
    const allowedCategories = ['PROFILE', 'COVER', 'LOGO', 'INTERIOR', 'EXTERIOR', 'PRODUCT', 'AT_WORK', 'FOOD_AND_DRINK', 'COMMON_AREA', 'ROOMS', 'TEAM', 'ADDITIONAL', 'MENU', 'IDENTITY', 'PROMOTIONAL', 'EVENT', 'OTHER'];
    let category = formData.get('category') as string;
    if (!allowedCategories.includes(category)) {
      category = 'PROFILE';
    }
    const accountName = formData.get('accountName') as string;
    const locationName = formData.get('locationName') as string;

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Account name and location name are required' },
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

    console.log('Resource name for photo upload:', resourceName);

    // If sourceUrl is present, skip file upload and use it directly
    if (sourceUrl) {
      // Use the exact method as the working curl example
      const metadataUrl = `https://mybusiness.googleapis.com/v4/${resourceName}/media`;
      const photoMetadata = {
        mediaFormat: 'PHOTO',
        locationAssociation: { category: 'ADDITIONAL' }, // Always use ADDITIONAL as in the curl
        sourceUrl,
        // description: 'Business photo uploaded via dashboard', // Optional, not in curl
      };
      const metadataResponse = await fetch(metadataUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(photoMetadata),
      });
      if (!metadataResponse.ok) {
        const errorText = await metadataResponse.text();
        return NextResponse.json({ error: errorText }, { status: metadataResponse.status });
      }
      const metadataResult = await metadataResponse.json();
      return NextResponse.json({ success: true, photo: metadataResult, message: 'Photo uploaded successfully (S3 URL used)' });
    }
    // If no sourceUrl, fallback to file upload (legacy)
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(fileBuffer);

    // Step 1: Upload the media file
    const uploadUrl = `https://mybusiness.googleapis.com/upload/v1/media/${resourceName}=**`;
    
    console.log('Uploading media to:', uploadUrl);

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': file.type,
        'X-Goog-Upload-Protocol': 'raw',
      },
      body: fileContent,
    });

    console.log('Media upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Media upload error:', errorText);
      
      if (uploadResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      } else if (uploadResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to upload photos.' },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: `Failed to upload media: ${uploadResponse.status} - ${errorText}` },
          { status: uploadResponse.status }
        );
      }
    }

    const uploadResult = await uploadResponse.json();
    console.log('Media upload successful:', uploadResult);

    // Step 2: Create the photo metadata
    const metadataUrl = `https://mybusiness.googleapis.com/v1/media/${resourceName}`;
    
    const photoMetadata = {
      locationAssociation: {
        category: category
      },
      description: `Business photo uploaded via dashboard`,
      mediaFormat: 'PHOTO'
    };

    console.log('Creating photo metadata at:', metadataUrl);
    console.log('Photo metadata:', photoMetadata);

    const metadataResponse = await fetch(metadataUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(photoMetadata),
    });

    console.log('Metadata creation response status:', metadataResponse.status);

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('Metadata creation error:', errorText);
      
      // Even if metadata creation fails, the photo might still be uploaded
      // Return a partial success response
      return NextResponse.json({
        success: true,
        warning: 'Photo uploaded but metadata creation failed',
        uploadResult: uploadResult,
        error: errorText
      });
    }

    const metadataResult = await metadataResponse.json();
    console.log('Photo metadata created successfully');

    // Return the complete photo object
    const photoResult = {
      name: metadataResult.name || `${resourceName}/media/${Date.now()}`,
      sourceUrl: uploadResult.sourceUrl || metadataResult.sourceUrl,
      thumbnailUrl: uploadResult.thumbnailUrl || metadataResult.thumbnailUrl,
      createTime: new Date().toISOString(),
      mediaFormat: 'PHOTO',
      locationAssociation: {
        category: category
      },
      description: photoMetadata.description,
      uploadResult: uploadResult,
      metadataResult: metadataResult
    };

    return NextResponse.json({
      success: true,
      photo: photoResult,
      message: 'Photo uploaded successfully'
    });

  } catch (error) {
    console.error('Photo upload API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload photo', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}