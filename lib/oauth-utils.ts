// lib/oauth-utils.ts
import db from '@/db/drizzle';
import { google_oauth } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { google } from 'googleapis';
import config from '@/lib/config';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

/**
 * Store OAuth tokens in database and optionally in cookies
 */
export async function storeOAuthTokens(userId: string, tokens: TokenData, updateCookies: boolean = false) {
  const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
  
  try {
    // Try to update existing record first
    const existingRecord = await db
      .select()
      .from(google_oauth)
      .where(eq(google_oauth.user_id, userId))
      .limit(1);

    if (existingRecord.length > 0) {
      // Update existing record
      await db
        .update(google_oauth)
        .set({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type || 'Bearer',
          scope: tokens.scope,
          expires_at: expiresAt,
          updated_at: new Date(),
        })
        .where(eq(google_oauth.user_id, userId));
    } else {
      // Insert new record
      await db.insert(google_oauth).values({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope,
        expires_at: expiresAt,
      });
    }

    // Update cookies if requested (for server components with Response)
    if (updateCookies && typeof window === 'undefined') {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      
      cookieStore.set('google_access_token', tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: tokens.expires_in,
        path: '/',
      });

      cookieStore.set('google_token_expiry', expiresAt.getTime().toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60,
        path: '/',
      });

      if (tokens.scope) {
        cookieStore.set('google_token_scope', tokens.scope, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }
    }

    console.log('OAuth tokens stored successfully for user:', userId);
    return true;
  } catch (error) {
    console.error('Error storing OAuth tokens:', error);
    throw error;
  }
}

/**
 * Get stored OAuth tokens for a user
 */
export async function getStoredOAuthTokens(userId: string) {
  try {
    const result = await db
      .select()
      .from(google_oauth)
      .where(eq(google_oauth.user_id, userId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error getting stored OAuth tokens:', error);
    return null;
  }
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() >= new Date(expiresAt.getTime() - 5 * 60 * 1000); // 5 minutes buffer
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenData | null> {
  try {
    console.log('Refreshing access token...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Token refresh failed:', errorData);
      return null;
    }

    const tokens = await response.json();
    console.log('Access token refreshed successfully');
    
    return {
      access_token: tokens.access_token,
      refresh_token: refreshToken, // Keep the same refresh token
      expires_in: tokens.expires_in,
      scope: tokens.scope,
      token_type: tokens.token_type,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const storedTokens = await getStoredOAuthTokens(userId);
    
    if (!storedTokens) {
      console.log('No stored tokens found for user:', userId);
      return null;
    }

    // Check if token is expired
    if (isTokenExpired(storedTokens.expires_at)) {
      console.log('Access token expired, refreshing...');
      
      // Refresh the token
      const newTokens = await refreshAccessToken(storedTokens.refresh_token);
      
      if (!newTokens) {
        console.log('Failed to refresh token');
        return null;
      }

      // Store the new tokens
      await storeOAuthTokens(userId, newTokens, true); // Update cookies too
      return newTokens.access_token;
    }

    return storedTokens.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}

/**
 * Delete OAuth tokens for a user (disconnect)
 */
export async function deleteOAuthTokens(userId: string): Promise<boolean> {
  try {
    await db
      .delete(google_oauth)
      .where(eq(google_oauth.user_id, userId));
    
    console.log('OAuth tokens deleted for user:', userId);
    return true;
  } catch (error) {
    console.error('Error deleting OAuth tokens:', error);
    return false;
  }
}

/**
 * Check if user has valid OAuth connection
 */
export async function hasValidOAuthConnection(userId: string): Promise<boolean> {
  try {
    const accessToken = await getValidAccessToken(userId);
    return accessToken !== null;
  } catch (error) {
    console.error('Error checking OAuth connection:', error);
    return false;
  }
}