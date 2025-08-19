import db from "@/db/drizzle";
import { users, instructions, inbound_instructions, userAccountMappings } from "@/db/schema";
import { eq, isNull, or } from "drizzle-orm";
import { secondaryClerkConfig } from "@/lib/config";
import { createSecondaryClerkUser, isSecondaryClerkConfigured } from "@/lib/clerk-utils";

// Create a new user if not already present.
export async function createUser(body: {
  id: string;
  email: string;
  userLocalTime: string;
}) {
  const { id, email, userLocalTime } = body;
  
  console.log(`createUser called with: id=${id}, email=${email}, userLocalTime=${userLocalTime}`);

  try {
    console.log("Checking for existing user...");
    
    // First, check for existing user by email (this is the most important check)
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Then, check for existing user by id
    const existingUserById = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      // User exists with the same email
      const existingUser = existingUserByEmail[0];
      console.log(`User with email ${email} already exists: ${JSON.stringify(existingUser)}`);
      
      if (existingUser.id === id) {
        // Same email and same ID - user already exists exactly as expected
        console.log(`User already exists with same email and ID: ${id}`);
        
        // Check if org_id needs to be updated
        if (existingUser.org_id === null) {
          console.log(`Updating existing user ${id} with null org_id to org_id = 387`);
          const [updatedUser] = await db
            .update(users)
            .set({
              org_id: 387,
              updated_at: new Date()
            })
            .where(eq(users.id, id))
            .returning();
          console.log(`User updated successfully: ${JSON.stringify(updatedUser)}`);
          return updatedUser;
        }
        
        console.log(`User already exists and has org_id set to: ${existingUser.org_id}`);
        return existingUser;
      } else {
        // Same email but different ID - this might be from organization invitation
        console.log(`User with email ${email} already exists with id ${existingUser.id}, but new id is ${id}`);
        console.log(`This might be from organization invitation. Returning existing user to avoid foreign key constraint issues.`);
        
        // Check if org_id needs to be updated on the existing user
        if (existingUser.org_id === null) {
          console.log(`Updating existing user ${existingUser.id} with null org_id to org_id = 387`);
          const [updatedUser] = await db
            .update(users)
            .set({
              org_id: 387,
              updated_at: new Date()
            })
            .where(eq(users.id, existingUser.id))
            .returning();
          console.log(`User updated successfully: ${JSON.stringify(updatedUser)}`);
          return updatedUser;
        }
        
        console.log(`Returning existing user with id ${existingUser.id} to avoid foreign key constraint issues`);
        return existingUser;
      }
    } else if (existingUserById.length > 0) {
      // User exists with the same id but different email (this shouldn't happen in normal cases)
      const existingUser = existingUserById[0];
      console.log(`User with id ${id} already exists but with different email: ${existingUser.email}`);
      
      // Check if org_id needs to be updated
      if (existingUser.org_id === null) {
        console.log(`Updating existing user ${id} with null org_id to org_id = 387`);
        const [updatedUser] = await db
          .update(users)
          .set({
            org_id: 387,
            updated_at: new Date()
          })
          .where(eq(users.id, id))
          .returning();
        console.log(`User updated successfully: ${JSON.stringify(updatedUser)}`);
        return updatedUser;
      }
      
      console.log(`User already exists and has org_id set to: ${existingUser.org_id}`);
      return existingUser;
    } else {
      // No existing user found, create new user
      console.log(`Inserting user into database: ${id}, ${email}`);
      console.log(`Inserting with org_id: 387`);
      
      let userRow;
      try {
        [userRow] = await db
          .insert(users)
          .values({
            id,
            email,
            org_id: 387, // Set default org_id to 387 for all new users
            created_at: new Date(userLocalTime),
            updated_at: new Date(userLocalTime),
          })
          .returning();
        console.log(`User created successfully: ${JSON.stringify(userRow)}`);
        console.log(`Created user org_id: ${userRow.org_id}`);
      } catch (insertError) {
        console.error("Error during user insert:", insertError);
        console.error("Insert error details:", insertError instanceof Error ? insertError.message : String(insertError));
        throw insertError;
      }

      // Create default prompts for the new user
      try {
        console.log("Creating default prompts for new user...");
        console.log("Step 1: Creating outbound instructions...");
        await createDefaultOutboundInstructions(id);
        console.log("Step 2: Creating inbound instructions...");
        await createDefaultInboundInstructions(id);
        console.log("Default prompts created successfully");
      } catch (promptError) {
        console.error("Error creating default prompts:", promptError);
        console.error("Prompt error details:", promptError instanceof Error ? promptError.message : String(promptError));
        // Don't throw the error - we still want the user to be created even if prompt creation fails
      }

      // Create user in secondary Clerk account if configured
      try {
        await createUserInSecondaryClerkAccount(id, email);
      } catch (secondaryAccountError) {
        console.error("Error creating user in secondary Clerk account:", secondaryAccountError);
        // Don't throw the error - we still want the user to be created in primary account
      }

      return userRow;
    }
  } catch (error) {
    console.error("Database insertion error:", error);
    throw error;
  }
}

/**
 * Creates a user in a secondary Clerk account
 * @param userId - The user ID from the primary Clerk account
 * @param email - The user's email address
 */
async function createUserInSecondaryClerkAccount(userId: string, email: string) {
  console.log(`createUserInSecondaryClerkAccount called with userId: ${userId}, email: ${email}`);
  
  if (!isSecondaryClerkConfigured()) {
    console.log('Secondary Clerk account not properly configured, skipping secondary account creation');
    return;
  }

  try {
    console.log(`Creating user in secondary Clerk account: ${email}`);
    console.log(`Using secondary Clerk config:`, {
      enabled: secondaryClerkConfig.enabled,
      apiUrl: secondaryClerkConfig.apiUrl,
      instanceName: secondaryClerkConfig.instanceName,
      hasSecretKey: !!secondaryClerkConfig.secretKey
    });

    const secondaryUser = await createSecondaryClerkUser(email, userId, {
      created_at: new Date().toISOString(),
      source: 'primary_signup'
    });

    if (!secondaryUser) {
      console.log('Secondary user creation returned null, skipping mapping storage');
      return;
    }

    console.log(`Successfully created user in secondary Clerk account: ${secondaryUser.id}`);

    // Store the secondary user ID in your database
    await storeSecondaryUserMapping(userId, secondaryUser.id);

    return secondaryUser;
  } catch (error) {
    console.error('Error creating user in secondary Clerk account:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

/**
 * Stores the mapping between primary and secondary user IDs
 * @param primaryUserId - The user ID from the primary Clerk account
 * @param secondaryUserId - The user ID from the secondary Clerk account
 */
async function storeSecondaryUserMapping(primaryUserId: string, secondaryUserId: string) {
  try {
    console.log(`Storing secondary user mapping: ${primaryUserId} -> ${secondaryUserId}`);
    
    // Store the mapping in the userAccountMappings table
    await db.insert(userAccountMappings).values({
      primary_user_id: primaryUserId,
      secondary_user_id: secondaryUserId,
      secondary_clerk_instance: secondaryClerkConfig.instanceName,
      created_at: new Date(),
      updated_at: new Date(),
    });
    
    console.log(`Successfully stored user mapping for ${primaryUserId}`);
  } catch (error) {
    console.error('Error storing secondary user mapping:', error);
    // Don't throw error as this is not critical for the main flow
  }
}

// Update all existing users with null org_id to set them to 387
export async function updateAllUsersWithNullOrgId() {
  try {
    console.log('Starting to update all existing users with null org_id...');
    
    // Find users with null org_id
    const usersWithNullOrgId = await db
      .select()
      .from(users)
      .where(isNull(users.org_id));
    
    console.log(`Found ${usersWithNullOrgId.length} users with null org_id`);
    
    if (usersWithNullOrgId.length === 0) {
      console.log('No users found with null org_id. All users already have org_id set.');
      return { updatedCount: 0, updatedUsers: [] };
    }
    
    // Update all users with null org_id to set org_id to 387
    const updatedUsers = await db
      .update(users)
      .set({
        org_id: 387,
        updated_at: new Date()
      })
      .where(isNull(users.org_id))
      .returning();
    
    console.log(`Successfully updated ${updatedUsers.length} users with org_id = 387`);
    console.log('Updated users:', updatedUsers.map(user => ({ id: user.id, email: user.email, org_id: user.org_id })));
    
    return { 
      updatedCount: updatedUsers.length, 
      updatedUsers: updatedUsers.map(user => ({ id: user.id, email: user.email, org_id: user.org_id }))
    };
    
  } catch (error) {
    console.error('Error updating existing users:', error);
    throw error;
  }
}

// Update an existing user.
export async function updateUser(
  id: string,
  updates: Partial<{ email: string }>
) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    console.log(`User updated: ${JSON.stringify(updatedUser)}`);
    return updatedUser;
  } catch (error) {
    console.error(`Error updating user ${id}:`, error);
    throw error;
  }
}

// Delete a user.
export async function deleteUser(id: string) {
  try {
    await db.delete(users).where(eq(users.id, id));
    console.log(`User with ID ${id} deleted.`);
    return true;
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    throw error;
  }
}

// Create default outbound instructions (for the "instructions" table).
export async function createDefaultOutboundInstructions(userId: string) {
  console.log(`Creating default outbound instructions for user: ${userId}`);
  const existingOutbound = await db
    .select()
    .from(instructions)
    .where(eq(instructions.user_id, userId));
  console.log(`Existing outbound instructions found: ${existingOutbound.length}`);
  if (existingOutbound.length > 0) {
    console.log(`Outbound instructions already exist for user ${userId}`);
    return existingOutbound[0];
  }

  // Default outbound prompt constants.
  const defaultFirstMessageText = "Hi! Am I speaking with {ClientName}?";
  const defaultRescheduleFirstMessageText = "Hi! This is a reminder for your rescheduled appointment with {ClientName}.";
  const defaultAfterCallText =
    "Thank you for speaking with us today. Your insights help us improve our service. If you have any additional feedback, please let us know.";
  const defaultContextText =
    "You are making an outbound call to {ClientName}, a recent customer of {CompanyName}, to gather valuable feedback and encourage them to leave a Google review. {CompanyName} values client insights to improve services and boost online visibility. Your role is to create a seamless and engaging experience for {ClientName}, ensuring they feel heard and appreciated.";
  const defaultRoleText =
    "You are {AgentName}, a Voice-AI expert in customer engagement and reputation management for {CompanyName}, an organization dedicated to enhancing businesses' online presence and customer satisfaction.";
  const defaultSpecificsText =
    "- Given your persuasive nature, you make statements that sound like questions but nudge the user towards your desired answer. Your sentences may have the form of a question but never end in a question mark.\n- If client ask more information about the company refer to {KnowledgeBase}\n- If client ask about the last interaction date refer to {LastVisitDate}";
  const defaultTaskText =
    "Your primary task is to request feedback about {ClientName}'s recent experience with {CompanyName} and, if the feedback is positive (7 or above on a scale of 1 to 10), encourage them to leave a Google review. If their rating is below 7, you should listen attentively, gather constructive feedback, and assure them their input will help improve services.";
  const defaultConversationFlowText = `1. Confirm if the person who answered is the client.
[ 1.1 If R = Confirms they are {ClientName} ] -> Proceed to step 2 to request feedback.
[ 1.2 If R = Denies they are {ClientName} ] -> Ask to speak with {ClientName} directly.`;
  const defaultSampleDialogueText = `Q = {AgentName}
R = whoever answers; C = {ClientName}
R: "Hello?"
Q: "Hi! Am I speaking with {ClientName}?"`;
  const defaultKeyPointsText = '[ If C = "I don\'t have time." ] -> reply politely.';
  const defaultLinkPromptText = "We value your feedback, {ClientName}. Please click the link below to share your experience with us: {Link}";

  try {
    console.log(`Attempting to insert outbound instructions for user: ${userId}`);
    console.log("Inserting values:", {
      user_id: userId,
      first_message_prompt: defaultFirstMessageText,
      reschedule_first_message_prompt: defaultRescheduleFirstMessageText,
      role_prompt: defaultRoleText,
      context_prompt: defaultContextText,
      task_prompt: defaultTaskText,
      specifics_prompt: defaultSpecificsText,
      conversation_flow_prompt: defaultConversationFlowText,
      sample_dialogue_prompt: defaultSampleDialogueText,
      key_points_prompt: defaultKeyPointsText,
      after_call_prompt: defaultAfterCallText,
      link_prompt: defaultLinkPromptText,
    });
    
    const [instructionRow] = await db
      .insert(instructions)
      .values({
        user_id: userId,
        first_message_prompt: defaultFirstMessageText,
        reschedule_first_message_prompt: defaultRescheduleFirstMessageText,
        role_prompt: defaultRoleText,
        context_prompt: defaultContextText,
        task_prompt: defaultTaskText,
        specifics_prompt: defaultSpecificsText,
        conversation_flow_prompt: defaultConversationFlowText,
        sample_dialogue_prompt: defaultSampleDialogueText,
        key_points_prompt: defaultKeyPointsText,
        after_call_prompt: defaultAfterCallText,
        link_prompt: defaultLinkPromptText,
      })
      .returning();
    console.log(`Default outbound instructions added for user ${userId}:`, instructionRow);
    return instructionRow;
  } catch (error) {
    console.error("Error creating default outbound instructions:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Create default inbound instructions (for the "inbound_instructions" table).
export async function createDefaultInboundInstructions(userId: string) {
  const existingInbound = await db
    .select()
    .from(inbound_instructions)
    .where(eq(inbound_instructions.user_id, userId));
  if (existingInbound.length > 0) {
    console.log(`Inbound instructions already exist for user ${userId}`);
    return existingInbound[0];
  }

  // Default inbound prompt constants.
  const defaultInboundFirstMessageText = "Hello, this is {AgentName} from {CompanyName} How can I help you today?";
  const defaultInboundRoleText = "You are {AgentName}, a Voice AI expert in customer engagement and reputation management for {CompanyName}, an organization dedicated to enhancing businesses' online presence and customer satisfaction.";
  const defaultInboundContextText = "You are handling an inbound call from {ClientName}, a recent customer of {CompanyName}, who is returning a missed call. Your goal is to create a seamless and engaging experience, ensuring {ClientName} feels heard and appreciated. Let them know you're calling to gather valuable feedback on their recent experience and encourage them to leave a Google review. {CompanyName} values client insights to improve services and boost online visibility.";
  const defaultInboundTaskText = "Your primary task is to request feedback about {ClientName}'s recent experience with {CompanyName} and, if the feedback is positive (7 or above on a scale of 1 to 10), encourage them to leave a Google review. If their rating is below 7, you should listen attentively, gather constructive feedback, and assure them their input will help improve services.";
  const defaultInboundSpecificsText = `[ #.#.# CONDITION ] This is a condition block, acting as identifiers of the intent of the user throughout the conversation, guiding the AI to navigate the correct conversation branches. The numbers at the start of each condition indicate the possible branches you can navigate to. For example, from 2. Confirm if the person calling back is {ClientName}, you can navigate to [ 2.1 If R = Confirms they are {ClientName} ] OR [ 2.2 If R = Denies they are {ClientName} ]; from [ 2.2 If R = Denies they are {ClientName} ], you can navigate to [ 2.2.1 If R = Yes or Maybe ] OR [ 2.2.2 If R = Client is explicitly not available ]
>variable> blocks should always be substituted with the information provided by the user.
The symbol ~ indicates an instruction you should follow but not say verbatim, e.g., **~ Proceed to requesting feedback ~**
Sentences in double quotes "Example sentence." should be said verbatim unless they would be incoherent or sound unnatural in the context of the conversation.
• You may only ask one question at a time.
• Wait for a response after each question you ask.
• If you reach a voicemail, do not leave a message—end the call immediately using the endCall tool.
• If the client has an inquiry that is irrelevant to the feedback request, say you'll pass on the message to customer support.
• When requesting a review, ask if they would like to receive the review link via SMS at the number they called from or if they prefer it sent to a different mobile number.
• If the client has questions about the service, provide only the information you know and then redirect them to customer support via phone or email.
• Follow the script closely but dynamically. If {ClientName} confirms they are the one returning the call, proceed to the C: portion of the script.
• Handle objections gracefully and transition smoothly into gathering feedback or encouraging a review.
• Given your persuasive nature, you make statements that sound like questions but nudge the user towards your desired answer. Your sentences may have the form of a question but never end in a question mark.
• If the client asks for more information about the company, refer to {KnowledgeBase}.
• If the client asks about their last interaction date, refer to {LastVisitDate}.`;
  const defaultInboundConversationFlowText = `1. Confirm if the person calling back is the client.
    • [ 1.1 If R = Confirms they are {ClientName} ] → Proceed to step 2 to request feedback.
    • [ 1.2 If R = Denies they are {ClientName} ] → Ask if {ClientName} is available to speak.
    • [ 1.2.1 If R = Yes or Maybe ] → Say you'll hold. When someone new picks up the phone, confirm you are now speaking with {ClientName} before proceeding to step 2.
    • [ 1.2.2 If R = Client is explicitly not available ] → Ask for an exact date and time to call back.
    • [ 1.3 If R = Indicates it's a bad time ] → Politely offer to reschedule: "I completely understand. When would be a better time for me to call back?"
2. Since you're speaking with the client (C:), introduce yourself and acknowledge their callback.
    • Example: "Hello! This is [Agent Name] from {CompanyName}. You may have received a call from us earlier—we were reaching out regarding your recent visit and would love to hear your feedback."
3. Ask for feedback on their recent experience.
4. If the rating is 7 or above, encourage them to leave a Google review.
    • [ 4.1 If C = Agrees to leave a review ] → Confirm their mobile number and inform them they'll receive a review link via SMS.
    • [ 4.2 If C = Hesitant ] → Reiterate how their review helps others discover {CompanyName} and acknowledge their positive feedback.
5. If the rating is below 7, listen attentively, acknowledge their concerns, and assure them their feedback will help improve services.
6. Once feedback is gathered and, if applicable, the review request is made, you may end the call using the EndCall function.`;
  const defaultInboundSampleDialogueText = `Q = {AgentName} (You); R = The person calling back, who may or may not be {ClientName}; C = {ClientName}
R: "Hi, I got a missed call from this number."
Q: "Hi! This is {AgentName} from {CompanyName}. Am I speaking with {ClientName}?"
    • [ 1.1 If R = Confirms they are {ClientName} ] → Proceed to request feedback:
Q: "Great! We were reaching out to check in on your recent experience with us. On a scale of 1 to 10, how would you rate your visit?"
    • [ 1.2 If R = Denies they are {ClientName} ] →
Q: "Oh, I see! We were actually trying to reach {ClientName}. Are they available to speak?"
    • [ 1.2.1 If R = Yes or Maybe ] → "No problem, I'll hold." [Wait for {ClientName} to come to the phone, then confirm identity and proceed to request feedback.]
    • [ 1.2.2 If R = Client is explicitly not available ] → "I understand! When would be a better time to reach them?"
C: "It was great, I'd say a 9."
Q: "That's wonderful to hear! Would you like to share your experience with others by leaving a Google review? I can send you a quick link."
C: "Sure, that would be great!"
Q: "Perfect! I'll send you the review link via SMS in just a few minutes. Thanks so much for your time, and have a great day!"`;
  const defaultInboundKeyPointsText = `[ If C = "I got a missed call but don't have time." ] →
Q: "I completely understand. When would be a better time for me to call back?"
    • [ If C = "Not interested in leaving a review." ] →
Q: "No worries, I appreciate your time and feedback. If you ever change your mind, we'd love to hear your thoughts."
    • [ If C = "Had a bad experience." ] →
Q: "I'm so sorry to hear that. Your feedback is really important, and I'll make sure our team reviews it carefully."`;
  const defaultInboundLinkPromptText = "Thank you, {CustomerName}. For more information, please visit: {Link}";
  const defaultInboundAfterCallText = "Thank you for calling us today. We appreciate your time and hope to assist you further. If you have any additional feedback, please let us know.";

  try {
    const [inboundRow] = await db
      .insert(inbound_instructions)
      .values({
        user_id: userId,
        first_message_prompt: defaultInboundFirstMessageText,
        role_prompt: defaultInboundRoleText,
        context_prompt: defaultInboundContextText,
        task_prompt: defaultInboundTaskText,
        specifics_prompt: defaultInboundSpecificsText,
        conversation_flow_prompt: defaultInboundConversationFlowText,
        sample_dialogue_prompt: defaultInboundSampleDialogueText,
        key_points_prompt: defaultInboundKeyPointsText,
        after_call_prompt: defaultInboundAfterCallText,
        link_prompt: defaultInboundLinkPromptText,
      })
      .returning();
    console.log(`Default inbound instructions added for user ${userId}`);
    return inboundRow;
  } catch (error) {
    console.error("Error creating default inbound instructions:", error);
    throw error;
  }
}
