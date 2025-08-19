import { NextResponse } from 'next/server';
import { secondaryClerkConfig } from '@/lib/config';
import { isSecondaryClerkConfigured } from '@/lib/clerk-utils';

export async function GET() {
  try {
    const config = {
      enabled: secondaryClerkConfig.enabled,
      hasSecretKey: !!secondaryClerkConfig.secretKey,
      apiUrl: secondaryClerkConfig.apiUrl,
      instanceName: secondaryClerkConfig.instanceName,
      isConfigured: isSecondaryClerkConfigured()
    };

    return NextResponse.json({
      success: true,
      config,
      message: config.isConfigured 
        ? 'Secondary Clerk account is properly configured' 
        : 'Secondary Clerk account is not configured'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        enabled: secondaryClerkConfig.enabled,
        hasSecretKey: !!secondaryClerkConfig.secretKey,
        apiUrl: secondaryClerkConfig.apiUrl,
        instanceName: secondaryClerkConfig.instanceName
      }
    }, { status: 500 });
  }
} 