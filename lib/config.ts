// lib/config.ts
export const config = {
  // Base URL configuration
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com',
  
  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '429150483588-3g1i793ubvua8pstal4uhh1inbjnspur.apps.googleusercontent.com',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com'}/api/auth/callback`,
  },
  
  // Build URLs
  urls: {
    authCallback: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com'}/api/auth/callback`,
    integrations: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com'}/Intergrations`,
    reviewLink: (userId: string) => `${process.env.NEXT_PUBLIC_BASE_URL || 'https://beta.taptify.com'}/${userId}`,
  }
};

// Secondary Clerk account configuration
export const secondaryClerkConfig = {
  enabled: process.env.SECONDARY_CLERK_ENABLED === 'true',
  secretKey: process.env.SECONDARY_CLERK_SECRET_KEY,
  apiUrl: process.env.SECONDARY_CLERK_API_URL || 'https://api.clerk.com/v1',
  instanceName: process.env.SECONDARY_CLERK_INSTANCE_NAME || 'secondary',
} as const;

export default config;