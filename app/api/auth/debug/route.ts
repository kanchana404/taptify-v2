import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getStoredOAuthTokens, hasValidOAuthConnection } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { google_oauth } from '@/db/schema';

export async function GET(request: NextRequest) {
  try {
    // Get the current user from Clerk
    const { userId } = await auth();
    
    const debugInfo: any = {
      userId: userId || 'No user ID found',
      timestamp: new Date().toISOString(),
    };

    if (userId) {
      // Check database
      try {
        const storedTokens = await getStoredOAuthTokens(userId);
        debugInfo.database = {
          hasTokens: !!storedTokens,
          tokenData: storedTokens ? {
            id: storedTokens.id,
            expires_at: storedTokens.expires_at,
            token_type: storedTokens.token_type,
            scope: storedTokens.scope,
            created_at: storedTokens.created_at,
            updated_at: storedTokens.updated_at,
            access_token_preview: storedTokens.access_token.substring(0, 20) + '...',
            refresh_token_preview: storedTokens.refresh_token.substring(0, 20) + '...',
          } : null,
        };

        const hasValidConnection = await hasValidOAuthConnection(userId);
        debugInfo.database.hasValidConnection = hasValidConnection;

        // Raw database query
        const allRecords = await db.select().from(google_oauth);
        debugInfo.database.totalRecords = allRecords.length;
        debugInfo.database.userRecords = allRecords.filter(r => r.user_id === userId).length;
      } catch (dbError) {
        debugInfo.database = {
          error: dbError instanceof Error ? dbError.message : 'Unknown database error'
        };
      }
    }

    // Check cookies
    try {
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('google_access_token')?.value;
      const refreshToken = cookieStore.get('google_refresh_token')?.value;
      const tokenExpiry = cookieStore.get('google_token_expiry')?.value;
      const tokenScope = cookieStore.get('google_token_scope')?.value;

      debugInfo.cookies = {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasExpiry: !!tokenExpiry,
        hasScope: !!tokenScope,
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : null,
        expiryTime: tokenExpiry || null,
        isExpired: tokenExpiry ? Date.now() >= parseInt(tokenExpiry) : null,
        scope: tokenScope || null,
      };
    } catch (cookieError) {
      debugInfo.cookies = {
        error: cookieError instanceof Error ? cookieError.message : 'Unknown cookie error'
      };
    }

    // Environment check
    debugInfo.environment = {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasGoogleRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
      nodeEnv: process.env.NODE_ENV,
    };

    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
