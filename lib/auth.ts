import { google } from 'googleapis';
import { cookies } from 'next/headers';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export interface TokenData {
  access_token: string | null;
  refresh_token: string | null;
  expiry_date: number | null;
}

export async function getTokensFromCookies(): Promise<TokenData> {
  const cookieStore = await cookies();
  
  const access_token = cookieStore.get('google_access_token')?.value || null;
  const refresh_token = cookieStore.get('google_refresh_token')?.value || null;
  const expiry_date = cookieStore.get('google_token_expiry')?.value || null;

  console.log('Retrieved tokens from cookies:', {
    access_token: access_token ? 'Present' : 'Missing',
    refresh_token: refresh_token ? 'Present' : 'Missing',
    expiry_date: expiry_date || 'Missing'
  });

  return {
    access_token,
    refresh_token,
    expiry_date: expiry_date ? parseInt(expiry_date) : null,
  };
}

export async function isTokenExpired(expiry_date: number | null): Promise<boolean> {
  if (!expiry_date) return true;
  
  // Add 5 minute buffer
  const bufferTime = 5 * 60 * 1000;
  return Date.now() >= (expiry_date - bufferTime);
}

export async function refreshAccessToken(refresh_token: string): Promise<any> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Token refresh failed:', errorData);
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokens = await response.json();
    console.log('Tokens refreshed successfully');
    
    return {
      access_token: tokens.access_token,
      expiry_date: Date.now() + (tokens.expires_in * 1000),
      expires_in: tokens.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const { access_token, refresh_token, expiry_date } = await getTokensFromCookies();

  if (!access_token) {
    console.log('No access token found');
    return null;
  }

  // Check if token is expired
  if (await isTokenExpired(expiry_date)) {
    console.log('Token expired, attempting refresh...');
    
    if (!refresh_token) {
      console.log('No refresh token available');
      return null;
    }

    try {
      // Refresh the token
      const newTokens = await refreshAccessToken(refresh_token);
      
      // Update cookies with new tokens
      const cookieStore = await cookies();
      
      if (newTokens.access_token) {
        cookieStore.set('google_access_token', newTokens.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: newTokens.expires_in || 3600,
          path: '/',
        });
      }

      if (newTokens.expiry_date) {
        cookieStore.set('google_token_expiry', newTokens.expiry_date.toString(), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60,
          path: '/',
        });
      }

      console.log('Token refreshed successfully');
      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      return null;
    }
  }

  console.log('Using existing valid token');
  return access_token;
}

export function setGoogleCredentials(tokens: any) {
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

export function getOAuth2Client() {
  return oauth2Client;
}