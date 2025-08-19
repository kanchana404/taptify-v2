// app/api/business/upload-media/route.ts - Improved media upload using resumable protocol
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Media upload API called');
    
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

    console.log('Access token found, processing media upload...');

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = formData.get('category') as string || 'OTHER';
    const accountName = formData.get('accountName') as string;
    const locationName = formData.get('locationName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Account name and location name are required' },
        { status: 400 }
      );
    }

    console.log('Upload details:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      category,
      accountName: accountName.substring(0, 20) + '...',
      locationName: locationName.substring(0, 20) + '...'
    });

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

    console.log('Resource name for media upload:', resourceName);

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new Uint8Array(fileBuffer);

    // Method 1: Try direct upload to media endpoint
    try {
      console.log('Attempting direct media upload...');
      
      const directUploadUrl = `https://mybusiness.googleapis.com/upload/v1/media/${resourceName}`;
      
      const directUploadResponse = await fetch(directUploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': file.type,
          'X-Goog-Upload-Protocol': 'raw',
          'X-Goog-Upload-Content-Length': fileContent.length.toString(),
        },
        body: fileContent,
      });

      console.log('Direct upload response status:', directUploadResponse.status);

      if (directUploadResponse.ok) {
        const uploadResult = await directUploadResponse.json();
        console.log('Direct upload successful:', uploadResult);

        // Create photo metadata
        const photoResult = {
          name: uploadResult.name || `${resourceName}/media/${Date.now()}`,
          sourceUrl: uploadResult.sourceUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          createTime: uploadResult.createTime || new Date().toISOString(),
          mediaFormat: uploadResult.mediaFormat || 'PHOTO',
          locationAssociation: {
            category: category
          },
          dimensions: uploadResult.dimensions,
          uploadResult: uploadResult
        };

        return NextResponse.json({
          success: true,
          photo: photoResult,
          message: 'Photo uploaded successfully',
          method: 'direct'
        });
      }
    } catch (directError) {
      console.log('Direct upload failed, trying resumable upload:', directError);
    }

    // Method 2: Use resumable upload protocol
    console.log('Attempting resumable upload...');
    
    // Step 1: Initiate resumable upload session
    const resumableInitUrl = `https://mybusiness.googleapis.com/upload/v1/media/${resourceName}?uploadType=resumable`;
    
    const mediaMetadata = {
      locationAssociation: {
        category: category
      },
      mediaFormat: file.type.startsWith('video/') ? 'VIDEO' : 'PHOTO'
    };

    const initResponse = await fetch(resumableInitUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Content-Type': file.type,
        'X-Goog-Upload-Content-Length': fileContent.length.toString(),
      },
      body: JSON.stringify(mediaMetadata),
    });

    console.log('Resumable init response status:', initResponse.status);

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error('Resumable init error:', errorText);
      
      if (initResponse.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please reconnect your Google account.' },
          { status: 401 }
        );
      } else if (initResponse.status === 403) {
        return NextResponse.json(
          { error: 'Insufficient permissions to upload media.' },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { error: `Failed to initiate upload: ${initResponse.status} - ${errorText}` },
          { status: initResponse.status }
        );
      }
    }

    // Get the upload URL from Location header
    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Failed to get upload URL from resumable init response' },
        { status: 500 }
      );
    }

    console.log('Upload URL obtained:', uploadUrl);

    // Step 2: Upload the file content
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'Content-Length': fileContent.length.toString(),
      },
      body: fileContent,
    });

    console.log('Resumable upload response status:', uploadResponse.status);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Resumable upload error:', errorText);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadResponse.status} - ${errorText}` },
        { status: uploadResponse.status }
      );
    }

    const uploadResult = await uploadResponse.json();
    console.log('Resumable upload successful:', uploadResult);

    // Create final photo result
    const photoResult = {
      name: uploadResult.name || `${resourceName}/media/${Date.now()}`,
      sourceUrl: uploadResult.sourceUrl,
      thumbnailUrl: uploadResult.thumbnailUrl,
      createTime: uploadResult.createTime || new Date().toISOString(),
      mediaFormat: uploadResult.mediaFormat || 'PHOTO',
      locationAssociation: {
        category: category
      },
      dimensions: uploadResult.dimensions,
      uploadResult: uploadResult
    };

    return NextResponse.json({
      success: true,
      photo: photoResult,
      message: 'Photo uploaded successfully',
      method: 'resumable'
    });

  } catch (error) {
    console.error('Media upload API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload media', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
