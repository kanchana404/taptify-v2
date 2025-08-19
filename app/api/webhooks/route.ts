import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import {
  createUser,
  updateUser,
  deleteUser,
  createDefaultOutboundInstructions,
  createDefaultInboundInstructions,
} from "@/actions/UserAction";
import db from "@/db/drizzle";
import { userOnboarding } from "@/db/schema";

export async function POST(req: Request) {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!CLERK_WEBHOOK_SECRET) {
    console.error("CLERK_WEBHOOK_SECRET is not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  try {
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    console.log("Webhook headers received:", {
      svix_id: svix_id ? "present" : "missing",
      svix_timestamp: svix_timestamp ? "present" : "missing",
      svix_signature: svix_signature ? "present" : "missing"
    });

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error("Missing svix headers:", { svix_id, svix_timestamp, svix_signature });
      return new Response("Error: Missing svix headers", { status: 400 });
    }

    // Get the raw body as text first
    const rawBody = await req.text();
    console.log("Raw webhook body length:", rawBody.length);

    // Validate that the body is not empty
    if (!rawBody || rawBody.length === 0) {
      console.error("Empty webhook body");
      return new Response("Error: Empty webhook body", { status: 400 });
    }

    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    let evt: WebhookEvent;

    try {
      evt = wh.verify(rawBody, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
      console.log("Webhook verification successful");
    } catch (err) {
      console.error("Webhook verification failed:", err);
      console.error("Webhook secret length:", CLERK_WEBHOOK_SECRET.length);
      console.error("Headers:", { svix_id, svix_timestamp, svix_signature });
      
      // Try to parse the body as JSON to see what we're receiving
      try {
        const bodyJson = JSON.parse(rawBody);
        console.error("Webhook body content:", JSON.stringify(bodyJson, null, 2));
        
        // If we can parse the body, let's try to process it anyway for debugging
        // This is not secure for production, but helps with debugging
        if (process.env.NODE_ENV === 'development') {
          console.log("Development mode: Attempting to process webhook without verification");
          evt = bodyJson as WebhookEvent;
        } else {
          return new Response("Webhook verification failed", { status: 400 });
        }
      } catch (parseError) {
        console.error("Could not parse webhook body as JSON");
        return new Response("Webhook verification failed", { status: 400 });
      }
    }

    const { id } = evt.data;
    if (!id) {
      console.error("User ID is undefined");
      return new Response("Error: User ID is undefined", { status: 400 });
    }

    const eventType = evt.type;
    console.log(`Processing webhook event: ${eventType} for user: ${id}`);

    switch (eventType) {
      case "user.created": {
        const { email_addresses } = evt.data;

        if (!email_addresses || email_addresses.length === 0) {
          console.error(`No email addresses found for user ${id}`);
          return new Response("No email addresses found", { status: 400 });
        }

        const userEmail = email_addresses[0].email_address;
        console.log(`Creating user - ID: ${id}, Email: ${userEmail}`);

        try {
          // Create user in the users table (this also creates default prompts).
          const createdUser = await createUser({
            id,
            email: userEmail,
            userLocalTime: new Date().toISOString(),
          });
          
          // Use the actual user ID (might be different if user already existed)
          const actualUserId = createdUser.id;
          
          // Create onboarding record for new user
          await db.insert(userOnboarding).values({
            user_id: actualUserId,
            profile_completed: false,
            voice_selected: false,
            google_connected: false,
            onboarding_completed: false,
            current_step: 'profile',
            created_at: new Date(),
            updated_at: new Date(),
          });
          
          console.log(`User and onboarding record created successfully for ${actualUserId}`);
          return new Response("User created", { status: 200 });
        } catch (error) {
          console.error("User creation failed", error);
          return new Response("User creation failed: " + String(error), { status: 500 });
        }
      }

      case "user.updated": {
        const { email_addresses } = evt.data;

        if (!email_addresses || email_addresses.length === 0) {
          console.error(`No email addresses found for user ${id}`);
          return new Response("No email addresses found", { status: 400 });
        }

        const userEmail = email_addresses[0].email_address;
        console.log(`Updating user - ID: ${id}, Email: ${userEmail}`);

        try {
          await updateUser(id, { email: userEmail });
          return new Response("User updated", { status: 200 });
        } catch (error) {
          console.error("User update failed", error);
          return new Response("User update failed: " + String(error), { status: 500 });
        }
      }

      case "user.deleted": {
        console.log(`Deleting user - ID: ${id}`);

        try {
          await deleteUser(id);
          return new Response("User deleted", { status: 200 });
        } catch (error) {
          console.error("User deletion failed", error);
          return new Response("User deletion failed: " + String(error), { status: 500 });
        }
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
        return new Response(`Unhandled event type: ${eventType}`, { status: 200 });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
