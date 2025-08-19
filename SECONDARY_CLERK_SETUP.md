# Secondary Clerk Account Setup

This document explains how to set up and use the secondary Clerk account functionality that automatically creates users in a secondary Clerk account when they sign up in the primary account.

## Overview

When a user signs up in your primary Clerk account, the system can automatically create the same user in a secondary Clerk account. This is useful for:

- Backup user management
- Multi-tenant applications
- Separate development/staging environments
- Analytics or reporting purposes

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Secondary Clerk Account Configuration
SECONDARY_CLERK_ENABLED=true
SECONDARY_CLERK_SECRET_KEY=sk_test_your_secondary_clerk_secret_key
SECONDARY_CLERK_API_URL=https://api.clerk.com/v1
SECONDARY_CLERK_INSTANCE_NAME=secondary
```

### Required Environment Variables

- `SECONDARY_CLERK_ENABLED`: Set to `true` to enable secondary account creation
- `SECONDARY_CLERK_SECRET_KEY`: The secret key from your secondary Clerk account
- `SECONDARY_CLERK_API_URL`: The Clerk API URL (defaults to `https://api.clerk.com/v1`)
- `SECONDARY_CLERK_INSTANCE_NAME`: A name for this secondary instance (defaults to `secondary`)

## Database Schema

The system uses a new table `user_account_mappings` to store the relationship between primary and secondary user IDs:

```sql
CREATE TABLE user_account_mappings (
  id SERIAL PRIMARY KEY,
  primary_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  secondary_user_id TEXT NOT NULL,
  secondary_clerk_instance TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(primary_user_id, secondary_clerk_instance)
);
```

## How It Works

1. **User Signup**: When a user signs up, Clerk sends a `user.created` webhook
2. **Primary User Creation**: The system creates the user in your primary database
3. **Secondary User Creation**: If configured, the system automatically creates the same user in the secondary Clerk account using the official Clerk API
4. **Mapping Storage**: The relationship between primary and secondary user IDs is stored in the `user_account_mappings` table

## Code Structure

### Key Files

- `actions/UserAction.ts`: Main user creation logic with secondary account support
- `lib/clerk-utils.ts`: Utility functions for secondary Clerk account operations
- `lib/config.ts`: Configuration for secondary Clerk account settings
- `db/schema.ts`: Database schema including the new mapping table

### Key Functions

- `createUser()`: Creates user in primary database and optionally in secondary account
- `createUserInSecondaryClerkAccount()`: Creates user in secondary Clerk account
- `storeSecondaryUserMapping()`: Stores the mapping between user IDs
- `createSecondaryClerkUser()`: Utility function for creating users in secondary account

## API Format

The system uses the official Clerk API format for creating users:

```json
{
  "external_id": null,
  "first_name": null,
  "last_name": null,
  "email_address": ["user@example.com"],
  "phone_number": [],
  "web3_wallet": [],
  "username": null,
  "password": null,
  "password_digest": null,
  "password_hasher": "",
  "skip_password_checks": true,
  "skip_password_requirement": true,
  "totp_secret": null,
  "backup_codes": [],
  "public_metadata": {
    "primary_user_id": "primary_user_id",
    "created_from_primary": true,
    "primary_instance": "main"
  },
  "private_metadata": {},
  "unsafe_metadata": {},
  "delete_self_enabled": null,
  "legal_accepted_at": null,
  "skip_legal_checks": null,
  "create_organization_enabled": null,
  "create_organizations_limit": null,
  "created_at": null
}
```

## Usage Examples

### Creating a User with Secondary Account

```typescript
import { createUser } from '@/actions/UserAction';

// This will automatically create the user in both primary and secondary accounts
const user = await createUser({
  id: 'user_123',
  email: 'user@example.com',
  userLocalTime: new Date().toISOString()
});
```

### Managing Secondary Users

```typescript
import { 
  createSecondaryClerkUser, 
  getSecondaryClerkUser, 
  updateSecondaryClerkUser,
  deleteSecondaryClerkUser 
} from '@/lib/clerk-utils';

// Create a user in secondary account
const secondaryUser = await createSecondaryClerkUser('user@example.com', 'primary_user_id');

// Get a user from secondary account
const user = await getSecondaryClerkUser('secondary_user_id');

// Update a user in secondary account
await updateSecondaryClerkUser('secondary_user_id', { 
  public_metadata: { status: 'active' } 
});

// Delete a user from secondary account
await deleteSecondaryClerkUser('secondary_user_id');
```

## Error Handling

The system is designed to be fault-tolerant:

- If secondary account creation fails, the primary user creation still succeeds
- Errors are logged but don't prevent the main user creation flow
- The system continues to work even if secondary account is not configured

## Monitoring

Check the logs for messages like:
- `"Creating user in secondary Clerk account: user@example.com"`
- `"Successfully created user in secondary Clerk account: user_456"`
- `"Successfully stored user mapping for user_123"`

## Troubleshooting

### Common Issues

1. **Secondary account not created**: Check if `SECONDARY_CLERK_ENABLED` is set to `true`
2. **Authentication errors**: Verify `SECONDARY_CLERK_SECRET_KEY` is correct
3. **API errors**: Check if `SECONDARY_CLERK_API_URL` is correct
4. **Database errors**: Ensure the `user_account_mappings` table exists

### Debug Mode

Enable debug logging by checking the console for detailed error messages when secondary account creation fails.

## Security Considerations

- Keep your secondary Clerk secret key secure
- Consider using different Clerk instances for different environments
- Regularly rotate your API keys
- Monitor for any unauthorized access attempts

## Future Enhancements

Potential improvements:
- Support for multiple secondary accounts
- Automatic user synchronization (updates, deletions)
- Webhook handling for secondary account events
- User migration tools between accounts 