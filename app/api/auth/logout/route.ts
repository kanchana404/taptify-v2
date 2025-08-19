import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteOAuthTokens } from '@/lib/oauth-utils';
import { auth } from '@clerk/nextjs/server';

export async function POST() {
  try {
    // Get the current user from Clerk
    const { userId } = await auth();
    
    if (userId) {
      // Delete tokens from database
      await deleteOAuthTokens(userId);
      console.log('OAuth tokens deleted from database for user:', userId);
    }

    const cookieStore = await cookies();

    // Clear all Google-related cookies
    cookieStore.set('google_access_token', '', { maxAge: 0, path: '/' });
    cookieStore.set('google_refresh_token', '', { maxAge: 0, path: '/' });
    cookieStore.set('google_token_expiry', '', { maxAge: 0, path: '/' });
    cookieStore.set('google_token_type', '', { maxAge: 0, path: '/' });
    cookieStore.set('google_token_scope', '', { maxAge: 0, path: '/' });

    console.log('All Google auth data cleared successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error during logout:', error);
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}