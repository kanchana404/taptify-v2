import { secondaryClerkConfig } from './config';

/**
 * Checks if the secondary Clerk account is properly configured
 */
export function isSecondaryClerkConfigured(): boolean {
  const isConfigured = Boolean(secondaryClerkConfig.enabled && secondaryClerkConfig.secretKey);
  console.log('Secondary Clerk configuration check:', {
    enabled: secondaryClerkConfig.enabled,
    hasSecretKey: !!secondaryClerkConfig.secretKey,
    apiUrl: secondaryClerkConfig.apiUrl,
    instanceName: secondaryClerkConfig.instanceName,
    isConfigured
  });
  return isConfigured;
}

/**
 * Creates a user in a secondary Clerk account
 * @param email - The user's email address
 * @param primaryUserId - The user ID from the primary Clerk account
 * @param metadata - Additional metadata to store with the user
 */
export async function createSecondaryClerkUser(
  email: string, 
  primaryUserId: string, 
  metadata: Record<string, any> = {}
) {
  console.log(`createSecondaryClerkUser called with email: ${email}, primaryUserId: ${primaryUserId}`);
  
  if (!isSecondaryClerkConfigured()) {
    console.log('Secondary Clerk account not properly configured, skipping creation');
    return null;
  }

  console.log(`Making request to secondary Clerk API: ${secondaryClerkConfig.apiUrl}/users`);
  
  const requestBody = {
    external_id: null,
    first_name: null,
    last_name: null,
    email_address: [email],
    phone_number: [],
    web3_wallet: [],
    username: null,
    password: null,
    skip_password_checks: true,
    skip_password_requirement: true,
    totp_secret: null,
    backup_codes: [],
    public_metadata: {
      primary_user_id: primaryUserId,
      created_from_primary: true,
      primary_instance: 'main',
      ...metadata
    },
    private_metadata: {},
    unsafe_metadata: {},
    delete_self_enabled: null,
    legal_accepted_at: null,
    skip_legal_checks: null,
    create_organization_enabled: null,
    create_organizations_limit: null,
    created_at: null
  };

  console.log(`Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${secondaryClerkConfig.apiUrl}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secondaryClerkConfig.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`Response status: ${response.status}`);
  console.log(`Response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Secondary Clerk API error:`, errorData);
    throw new Error(`Failed to create user in secondary Clerk account: ${JSON.stringify(errorData)}`);
  }

  const result = await response.json();
  console.log(`Successfully created user in secondary Clerk account:`, result);
  return result;
}

/**
 * Gets a user from the secondary Clerk account
 * @param secondaryUserId - The user ID from the secondary Clerk account
 */
export async function getSecondaryClerkUser(secondaryUserId: string) {
  if (!secondaryClerkConfig.enabled || !secondaryClerkConfig.secretKey) {
    throw new Error('Secondary Clerk account not configured');
  }

  const response = await fetch(`${secondaryClerkConfig.apiUrl}/users/${secondaryUserId}`, {
    headers: {
      'Authorization': `Bearer ${secondaryClerkConfig.secretKey}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to get user from secondary Clerk account: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Updates a user in the secondary Clerk account
 * @param secondaryUserId - The user ID from the secondary Clerk account
 * @param updates - The updates to apply to the user
 */
export async function updateSecondaryClerkUser(
  secondaryUserId: string, 
  updates: Record<string, any>
) {
  if (!secondaryClerkConfig.enabled || !secondaryClerkConfig.secretKey) {
    throw new Error('Secondary Clerk account not configured');
  }

  const response = await fetch(`${secondaryClerkConfig.apiUrl}/users/${secondaryUserId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${secondaryClerkConfig.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to update user in secondary Clerk account: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Deletes a user from the secondary Clerk account
 * @param secondaryUserId - The user ID from the secondary Clerk account
 */
export async function deleteSecondaryClerkUser(secondaryUserId: string) {
  if (!secondaryClerkConfig.enabled || !secondaryClerkConfig.secretKey) {
    throw new Error('Secondary Clerk account not configured');
  }

  const response = await fetch(`${secondaryClerkConfig.apiUrl}/users/${secondaryUserId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${secondaryClerkConfig.secretKey}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to delete user from secondary Clerk account: ${JSON.stringify(errorData)}`);
  }

  return true;
} 