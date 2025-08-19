// app/api/instructions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { instructions, companyData, extra_details, reviewLinks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createDefaultOutboundInstructions, createDefaultInboundInstructions, createUser } from "@/actions/UserAction";

function sanitizePrompt(prompt: string | undefined): string | null {
  console.log("sanitizePrompt input:", prompt, "type:", typeof prompt);
  if (!prompt) {
    console.log("Returning null for falsy value");
    return null;
  }
  // Preserve empty strings as empty strings, don't convert to null
  if (prompt === "") {
    console.log("Returning empty string for empty string");
    return "";
  }
  console.log("Returning sanitized prompt:", prompt.replace(/ sif have /g, "'"));
  return prompt.replace(/ sif have /g, "'");
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("GET /api/instructions called for user:", userId);

    // Ensure user exists in database
    let actualUserId = userId;
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      console.log(`User ${userId} not found in database, creating user first`);
      try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
        
        const createdUser = await createUser({
          id: userId,
          email: userEmail,
          userLocalTime: new Date().toISOString(),
        });
        console.log(`User created/retrieved successfully: ${JSON.stringify(createdUser)}`);
        actualUserId = createdUser.id;
      } catch (error) {
        console.error(`Error creating user ${userId}:`, error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else {
      actualUserId = existingUser[0].id;
      console.log(`User ${actualUserId} found in database`);
    }

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type");

    console.log("Fetching data for user:", actualUserId, "type:", type);

    try {
      const [instr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));
      const [company] = await db.select().from(companyData).where(eq(companyData.user_id, actualUserId));
      const [extra] = await db.select().from(extra_details).where(eq(extra_details.userid, actualUserId));
      const [reviewLink] = await db.select().from(reviewLinks).where(eq(reviewLinks.user_id, actualUserId));

      console.log("Database query results:", {
        instructions: instr ? "found" : "not found",
        company: company ? "found" : "not found",
        extra: extra ? "found" : "not found",
        reviewLink: reviewLink ? "found" : "not found"
      });

      if (company) {
        console.log("Company data found:", company);
      }
      if (extra) {
        console.log("Extra details found:", extra);
      }

      // Check if user has instructions, if not create default ones
      if (!instr) {
        console.log(`No instructions found for user ${actualUserId}, creating default instructions...`);
        try {
          await createDefaultOutboundInstructions(actualUserId);
          await createDefaultInboundInstructions(actualUserId);
          console.log(`Default instructions created for user ${actualUserId}`);
          
          // Fetch the newly created instructions
          const [newInstr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));
          if (newInstr) {
            console.log(`Retrieved newly created instructions for user ${actualUserId}`);
          }
        } catch (error) {
          console.error(`Error creating default instructions for user ${actualUserId}:`, error);
        }
      } else if (!instr.reschedule_first_message_prompt) {
        // If instructions exist but reschedule_first_message_prompt is null/empty, update it
        console.log(`Updating missing reschedule_first_message_prompt for user ${actualUserId}...`);
        try {
          const defaultRescheduleFirstMessageText = "Hi! This is a reminder for your rescheduled appointment with {ClientName}.";
          
          await db
            .update(instructions)
            .set({
              reschedule_first_message_prompt: defaultRescheduleFirstMessageText,
              updated_at: new Date(),
            })
            .where(eq(instructions.user_id, actualUserId));
          
          console.log(`Updated reschedule_first_message_prompt for user ${actualUserId}`);
        } catch (error) {
          console.error(`Error updating reschedule_first_message_prompt for user ${actualUserId}:`, error);
        }
      }

      // Fetch instructions again (in case they were just created)
      const [updatedInstr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));

      // If type is inbound, return only inbound prompts
      if (type === "inbound") {
        return NextResponse.json({
          first_message_prompt: updatedInstr?.first_message_prompt ?? "",
          role_prompt: updatedInstr?.role_prompt ?? "",
          context_prompt: updatedInstr?.context_prompt ?? "",
          task_prompt: updatedInstr?.task_prompt ?? "",
          specifics_prompt: updatedInstr?.specifics_prompt ?? "",
          conversation_flow_prompt: updatedInstr?.conversation_flow_prompt ?? "",
          sample_dialogue_prompt: updatedInstr?.sample_dialogue_prompt ?? "",
          key_points_prompt: updatedInstr?.key_points_prompt ?? "",
          link_prompt: updatedInstr?.link_prompt ?? "",
          after_call_prompt: updatedInstr?.after_call_prompt ?? "",
          reschedule_first_message_prompt: updatedInstr?.reschedule_first_message_prompt ?? "",
        });
      }

      // If type is outbound, return only outbound prompts
      if (type === "outbound") {
        console.log("Fetching outbound prompts for user:", actualUserId);
        console.log("Instructions from DB:", updatedInstr);
        
        const outboundData = {
          first_message_prompt: updatedInstr?.first_message_prompt ?? "",
          reschedule_first_message_prompt: updatedInstr?.reschedule_first_message_prompt ?? "",
          role_prompt: updatedInstr?.role_prompt ?? "",
          context_prompt: updatedInstr?.context_prompt ?? "",
          task_prompt: updatedInstr?.task_prompt ?? "",
          specifics_prompt: updatedInstr?.specifics_prompt ?? "",
          conversation_flow_prompt: updatedInstr?.conversation_flow_prompt ?? "",
          sample_dialogue_prompt: updatedInstr?.sample_dialogue_prompt ?? "",
          key_points_prompt: updatedInstr?.key_points_prompt ?? "",
          link_prompt: updatedInstr?.link_prompt ?? "",
          after_call_prompt: updatedInstr?.after_call_prompt ?? "",
        };
        
        console.log("Outbound data:", outboundData);
        return NextResponse.json(outboundData);
      }

      // Return all data
      return NextResponse.json({
        instructions: updatedInstr || {},
        company: company || {},
        extra: extra || {},
        reviewLink: reviewLink || {},
      });
    } catch (error) {
      console.error("Error fetching instructions:", error);
      return NextResponse.json(
        { error: "Failed to fetch instructions" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in GET /api/instructions:", error);
    return NextResponse.json(
      { error: "Failed to fetch instructions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in database
    let actualUserId = userId;
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      console.log(`User ${userId} not found in database, creating user first`);
      try {
        const user = await currentUser();
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || `${userId}@placeholder.com`;
        
        const createdUser = await createUser({
          id: userId,
          email: userEmail,
          userLocalTime: new Date().toISOString(),
        });
        console.log(`User created/retrieved successfully: ${JSON.stringify(createdUser)}`);
        actualUserId = createdUser.id;
      } catch (error) {
        console.error(`Error creating user ${userId}:`, error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else {
      actualUserId = existingUser[0].id;
    }

    const data = await req.json();
    const type = data.type; // Get the type from the request body
    
    console.log("Received data:", data);
    console.log("Type:", type);
    console.log("Company name from request:", data.company_name);
    console.log("Has prompt data:", {
      first_message_prompt: data.first_message_prompt !== undefined,
      role_prompt: data.role_prompt !== undefined,
      context_prompt: data.context_prompt !== undefined,
      task_prompt: data.task_prompt !== undefined,
      specifics_prompt: data.specifics_prompt !== undefined,
      conversation_flow_prompt: data.conversation_flow_prompt !== undefined,
      sample_dialogue_prompt: data.sample_dialogue_prompt !== undefined,
      key_points_prompt: data.key_points_prompt !== undefined,
      link_prompt: data.link_prompt !== undefined,
      after_call_prompt: data.after_call_prompt !== undefined,
      reschedule_first_message_prompt: data.reschedule_first_message_prompt !== undefined,
    });

    // Handle fixing missing reschedule_first_message_prompt
    if (type === "fix-missing-reschedule") {
      console.log("Fixing missing reschedule_first_message_prompt for user:", actualUserId);
      
      const [existingInstr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));
      
      if (!existingInstr) {
        console.log(`No instructions found for user ${actualUserId}, creating default instructions first`);
        try {
          await createDefaultOutboundInstructions(actualUserId);
          await createDefaultInboundInstructions(actualUserId);
          console.log(`Default instructions created for user ${actualUserId}`);
          
          // Fetch the newly created instructions
          const [newInstr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));
          if (newInstr) {
            console.log(`Retrieved newly created instructions for user ${actualUserId}`);
            return NextResponse.json({ 
              success: true, 
              message: "Default instructions created and reschedule first message prompt has been set to default value" 
            });
          } else {
            return NextResponse.json({ error: "Failed to create default instructions" }, { status: 500 });
          }
        } catch (error) {
          console.error(`Error creating default instructions for user ${actualUserId}:`, error);
          return NextResponse.json({ error: "Failed to create default instructions" }, { status: 500 });
        }
      }
      
      if (!existingInstr.reschedule_first_message_prompt) {
        const defaultRescheduleFirstMessageText = "Hi! This is a reminder for your rescheduled appointment with {ClientName}.";
        
        await db
          .update(instructions)
          .set({
            reschedule_first_message_prompt: defaultRescheduleFirstMessageText,
            updated_at: new Date(),
          })
          .where(eq(instructions.user_id, actualUserId));
        
        console.log("Fixed missing reschedule_first_message_prompt for user:", actualUserId);
        return NextResponse.json({ 
          success: true, 
          message: "Reschedule first message prompt has been set to default value" 
        });
      } else {
        return NextResponse.json({ 
          success: true, 
          message: "Reschedule first message prompt already exists" 
        });
      }
    }

    // Handle checking and fixing database table structure
    if (type === "check-table-structure") {
      console.log("Checking database table structure for instructions table...");
      
      try {
        // Try to select the reschedule_first_message_prompt column specifically
        const testQuery = await db.select({ 
          reschedule_first_message_prompt: instructions.reschedule_first_message_prompt 
        }).from(instructions).limit(1);
        
        console.log("Column exists in schema, checking if it exists in database...");
        
        // If we get here, the column exists in the schema
        // Now let's check if it actually exists in the database by trying to insert a test value
        const [existingInstr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));
        
        if (existingInstr) {
          // Try to update the existing record to see if the column exists
          try {
            await db
              .update(instructions)
              .set({
                reschedule_first_message_prompt: "Test value",
                updated_at: new Date(),
              })
              .where(eq(instructions.user_id, actualUserId));
            
            console.log("Column exists and is writable");
            return NextResponse.json({ 
              success: true, 
              message: "Column exists and is writable" 
            });
          } catch (updateError) {
            console.error("Error updating column:", updateError);
            return NextResponse.json({ 
              error: "Column exists but is not writable",
              details: updateError 
            }, { status: 500 });
          }
        } else {
          console.log("No existing instructions found, creating test record...");
          try {
            await createDefaultOutboundInstructions(actualUserId);
            console.log("Test record created successfully");
            return NextResponse.json({ 
              success: true, 
              message: "Test record created successfully" 
            });
          } catch (createError) {
            console.error("Error creating test record:", createError);
            return NextResponse.json({ 
              error: "Failed to create test record",
              details: createError 
            }, { status: 500 });
          }
        }
      } catch (error) {
        console.error("Error checking table structure:", error);
        return NextResponse.json({ 
          error: "Failed to check table structure",
          details: error 
        }, { status: 500 });
      }
    }

    // Handle business name update (stored in reviewLinks table)
    if (data.company_name !== undefined) {
      const businessNameValue = data.company_name || null;
      
      // Check if this is a partial update (only updating business name)
      const isPartialUpdate = Object.keys(data).length === 1;
      
      // ALWAYS update both company_data and review_links tables for business name consistency
      console.log("Updating business name in both company_data and review_links tables:", businessNameValue);
      
      // Update company_data table
      const [existingCompany] = await db.select().from(companyData).where(eq(companyData.user_id, actualUserId));
      if (existingCompany) {
        await db
          .update(companyData)
          .set({ 
            company_name: businessNameValue,
            updated_at: new Date()
          })
          .where(eq(companyData.user_id, actualUserId));
        console.log("Updated company_data.company_name");
      } else {
        // Create new company data record if it doesn't exist
        await db.insert(companyData).values({
          user_id: actualUserId,
          company_name: businessNameValue,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log("Created new company_data record with company_name");
      }
      
      // Update business name in reviewLinks table
      const [existingReviewLink] = await db.select().from(reviewLinks).where(eq(reviewLinks.user_id, actualUserId));
      
      if (existingReviewLink) {
        await db
          .update(reviewLinks)
          .set({ 
            business_name: businessNameValue,
            updated_at: new Date() // Update the timestamp
          })
          .where(eq(reviewLinks.user_id, actualUserId));
        console.log("Updated review_links.business_name");
      } else {
        // Create a new record with default values if it doesn't exist
        await db.insert(reviewLinks).values({
          user_id: actualUserId,
          review_link_url: `/review/${actualUserId}`, // Default URL
          review_title: "Customer Review", // Default title
          business_name: businessNameValue,
          // Default values will be set for other fields by the schema
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log("Created new review_links record with business_name");
      }
      
      // If it's a partial update, return now
      if (isPartialUpdate) {
        return NextResponse.json({ 
          success: true, 
          message: "Business name updated successfully in both company profile and QR settings" 
        });
      }
    }

    // Handle full data updates
    const sanitizedData = {
      first_message_prompt: sanitizePrompt(data.first_message_prompt),
      reschedule_first_message_prompt: sanitizePrompt(data.reschedule_first_message_prompt),
      role_prompt: sanitizePrompt(data.role_prompt),
      context_prompt: sanitizePrompt(data.context_prompt),
      task_prompt: sanitizePrompt(data.task_prompt),
      specifics_prompt: sanitizePrompt(data.specifics_prompt),
      conversation_flow_prompt: sanitizePrompt(data.conversation_flow_prompt),
      sample_dialogue_prompt: sanitizePrompt(data.sample_dialogue_prompt),
      key_points_prompt: sanitizePrompt(data.key_points_prompt),
      link_prompt: sanitizePrompt(data.link_prompt),
      after_call_prompt: sanitizePrompt(data.after_call_prompt),
      agent_name: data.agent_name || null,
      company_contact_number: data.company_contact_number || null,
      company_contact_email: data.company_contact_email || null,
      company_contact_address: data.company_contact_address || null,
      product_or_service: data.product_or_service || null,
      link: data.link || null,
      knowledge_base: data.knowledge_base || null,
      professional_questions: data.professional_questions || null,
      profession: data.profession || null,
      any_additional_requests: data.any_additional_requests || null,
      experience_last_visit: data.experience_last_visit || null,
      role: data.role || null,
      user_timezone: data.user_timezone || null,
    };

    console.log("Sanitized data:", sanitizedData);

    // Update instructions table only if prompt data is provided
    const hasPromptData = data.first_message_prompt !== undefined || 
                         data.role_prompt !== undefined || 
                         data.context_prompt !== undefined ||
                         data.task_prompt !== undefined ||
                         data.specifics_prompt !== undefined ||
                         data.conversation_flow_prompt !== undefined ||
                         data.sample_dialogue_prompt !== undefined ||
                         data.key_points_prompt !== undefined ||
                         data.link_prompt !== undefined ||
                         data.after_call_prompt !== undefined ||
                         data.reschedule_first_message_prompt !== undefined;

    if (hasPromptData) {
      const [existingInstr] = await db.select().from(instructions).where(eq(instructions.user_id, actualUserId));
      if (existingInstr) {
        console.log("Updating existing instructions with prompt data");
        await db
          .update(instructions)
          .set({
            first_message_prompt: sanitizedData.first_message_prompt,
            reschedule_first_message_prompt: sanitizedData.reschedule_first_message_prompt,
            role_prompt: sanitizedData.role_prompt,
            context_prompt: sanitizedData.context_prompt,
            task_prompt: sanitizedData.task_prompt,
            specifics_prompt: sanitizedData.specifics_prompt,
            conversation_flow_prompt: sanitizedData.conversation_flow_prompt,
            sample_dialogue_prompt: sanitizedData.sample_dialogue_prompt,
            key_points_prompt: sanitizedData.key_points_prompt,
            link_prompt: sanitizedData.link_prompt,
            after_call_prompt: sanitizedData.after_call_prompt,
            updated_at: new Date()
          })
          .where(eq(instructions.user_id, actualUserId));
      } else {
        console.log("Creating new instructions with prompt data");
        await db.insert(instructions).values({
          user_id: actualUserId,
          first_message_prompt: sanitizedData.first_message_prompt,
          reschedule_first_message_prompt: sanitizedData.reschedule_first_message_prompt,
          role_prompt: sanitizedData.role_prompt,
          context_prompt: sanitizedData.context_prompt,
          task_prompt: sanitizedData.task_prompt,
          specifics_prompt: sanitizedData.specifics_prompt,
          conversation_flow_prompt: sanitizedData.conversation_flow_prompt,
          sample_dialogue_prompt: sanitizedData.sample_dialogue_prompt,
          key_points_prompt: sanitizedData.key_points_prompt,
          link_prompt: sanitizedData.link_prompt,
          after_call_prompt: sanitizedData.after_call_prompt,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    } else {
      console.log("No prompt data provided, skipping instructions update");
    }

    // Only update company data and extra details if it's not an inbound-only or outbound-only update
    if (type !== "inbound" && type !== "outbound") {
      // Update company data table
      const [existingCompany] = await db.select().from(companyData).where(eq(companyData.user_id, actualUserId));
      if (existingCompany) {
        console.log("Updating existing company data");
        console.log("Updating company data with company_name:", data.company_name);
        await db
          .update(companyData)
          .set({
            company_name: data.company_name || null,
            agent_name: sanitizedData.agent_name,
            contact_number: sanitizedData.company_contact_number,
            contact_email: sanitizedData.company_contact_email,
            company_address: sanitizedData.company_contact_address,
            product_or_service: sanitizedData.product_or_service,
            link: sanitizedData.link,
            updated_at: new Date()
          })
          .where(eq(companyData.user_id, actualUserId));
      } else {
        console.log("Creating new company data with company_name:", data.company_name);
        await db.insert(companyData).values({
          user_id: actualUserId,
          company_name: data.company_name || null,
          agent_name: sanitizedData.agent_name,
          contact_number: sanitizedData.company_contact_number,
          contact_email: sanitizedData.company_contact_email,
          company_address: sanitizedData.company_contact_address,
          product_or_service: sanitizedData.product_or_service,
          link: sanitizedData.link,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      // Note: review_links.business_name is already updated in the business name section above
      // No need to duplicate the update here

      // Update extra details table
      const [existingExtra] = await db.select().from(extra_details).where(eq(extra_details.userid, actualUserId));
      if (existingExtra) {
        console.log("Updating existing extra details");
        await db
          .update(extra_details)
          .set({
            knowledge_base: sanitizedData.knowledge_base,
            professional_questions: sanitizedData.professional_questions,
            profession: sanitizedData.profession,
            any_additional_requests: sanitizedData.any_additional_requests,
            experience_last_visit: sanitizedData.experience_last_visit,
            role: sanitizedData.role,
            user_timezone: sanitizedData.user_timezone,
          })
          .where(eq(extra_details.userid, actualUserId));
      } else {
        console.log("Creating new extra details");
        await db.insert(extra_details).values({
          userid: actualUserId,
          knowledge_base: sanitizedData.knowledge_base,
          professional_questions: sanitizedData.professional_questions,
          profession: sanitizedData.profession,
          any_additional_requests: sanitizedData.any_additional_requests,
          experience_last_visit: sanitizedData.experience_last_visit,
          role: sanitizedData.role,
          user_timezone: sanitizedData.user_timezone,
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: type === "inbound" ? "Inbound prompts saved successfully" : 
               type === "outbound" ? "Outbound prompts saved successfully" : 
               "Instructions saved successfully" 
    });
  } catch (error) {
    console.error("Error saving instructions:", error);
    return NextResponse.json(
      { error: "Failed to save instructions" },
      { status: 500 }
    );
  }
}