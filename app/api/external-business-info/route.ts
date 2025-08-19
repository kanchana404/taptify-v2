// app/api/external-business-info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';

export async function GET(request: NextRequest) {
  try {
    console.log('External Business Info API called');
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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

    console.log('Access token found, fetching business info...');

    // Get business accounts
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

    const accounts = accountsData.accounts || [];
    const businessInfo = [];

    // For each account, get its locations
    for (const account of accounts) {
      const accountName = account.name;
      console.log('Fetching locations for account:', accountName);

      // Try to get locations using the business information API
      let locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // If that fails, try with minimal read_mask
      if (!locationsResponse.ok) {
        console.log('Trying with minimal read_mask...');
        locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // If that also fails, try the account management API
      if (!locationsResponse.ok) {
        console.log('Trying account management API...');
        locationsResponse = await fetch(`https://mybusinessaccountmanagement.googleapis.com/v1/${accountName}/locations`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];

        businessInfo.push({
          account: {
            name: account.name,
            accountName: account.accountName,
            type: account.type,
            role: account.role,
            verificationState: account.verificationState
          },
          locations: locations.map((location: any) => ({
            name: location.name,
            title: location.title,
            locationName: location.locationName,
            primaryCategory: location.primaryCategory,
            address: location.address,
            phoneNumbers: location.phoneNumbers,
            websiteUri: location.websiteUri
          }))
        });
      } else {
        console.log(`Failed to fetch locations for account ${accountName}`);
        businessInfo.push({
          account: {
            name: account.name,
            accountName: account.accountName,
            type: account.type,
            role: account.role,
            verificationState: account.verificationState
          },
          locations: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      userId: userId,
      businessInfo: businessInfo,
      totalAccounts: businessInfo.length,
      totalLocations: businessInfo.reduce((sum, info) => sum + info.locations.length, 0)
    });

  } catch (error) {
    console.error('External Business Info API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch business information', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST method to get business info for a specific user
export async function POST(request: NextRequest) {
  try {
    console.log('External Business Info POST API called');
    
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required in request body' },
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

    console.log('Access token found, fetching business info...');

    // Get business accounts
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

    const accounts = accountsData.accounts || [];
    const businessInfo = [];

    // For each account, get its locations
    for (const account of accounts) {
      const accountName = account.name;
      console.log('Fetching locations for account:', accountName);

      // Try to get locations using the business information API
      let locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // If that fails, try with minimal read_mask
      if (!locationsResponse.ok) {
        console.log('Trying with minimal read_mask...');
        locationsResponse = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      // If that also fails, try the account management API
      if (!locationsResponse.ok) {
        console.log('Trying account management API...');
        locationsResponse = await fetch(`https://mybusinessaccountmanagement.googleapis.com/v1/${accountName}/locations`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
      }

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];

        businessInfo.push({
          account: {
            name: account.name,
            accountName: account.accountName,
            type: account.type,
            role: account.role,
            verificationState: account.verificationState
          },
          locations: locations.map((location: any) => ({
            name: location.name,
            title: location.title,
            locationName: location.locationName,
            primaryCategory: location.primaryCategory,
            address: location.address,
            phoneNumbers: location.phoneNumbers,
            websiteUri: location.websiteUri
          }))
        });
      } else {
        console.log(`Failed to fetch locations for account ${accountName}`);
        businessInfo.push({
          account: {
            name: account.name,
            accountName: account.accountName,
            type: account.type,
            role: account.role,
            verificationState: account.verificationState
          },
          locations: []
        });
      }
    }

    return NextResponse.json({
      success: true,
      userId: userId,
      businessInfo: businessInfo,
      totalAccounts: businessInfo.length,
      totalLocations: businessInfo.reduce((sum, info) => sum + info.locations.length, 0)
    });

  } catch (error) {
    console.error('External Business Info POST API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch business information', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 