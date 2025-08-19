// app/api/inbound-instructions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { inbound_instructions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [instr] = await db
    .select()
    .from(inbound_instructions)
    .where(eq(inbound_instructions.user_id, userId));

  return NextResponse.json(instr ?? {});
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Check if link_prompt contains {Link} keyword
    if (data.link_prompt && !data.link_prompt.includes("{Link}")) {
      return NextResponse.json(
        { error: "SMS prompt must include the {Link} keyword" },
        { status: 400 }
      );
    }

    const [existingInstr] = await db
      .select()
      .from(inbound_instructions)
      .where(eq(inbound_instructions.user_id, userId));

    if (existingInstr) {
      await db
        .update(inbound_instructions)
        .set({
          first_message_prompt: data.first_message_prompt || null,
          role_prompt: data.role_prompt || null,
          context_prompt: data.context_prompt || null,
          task_prompt: data.task_prompt || null,
          specifics_prompt: data.specifics_prompt || null,
          conversation_flow_prompt: data.conversation_flow_prompt || null,
          sample_dialogue_prompt: data.sample_dialogue_prompt || null,
          key_points_prompt: data.key_points_prompt || null,
          after_call_prompt: data.after_call_prompt || null,
          link_prompt: data.link_prompt || null,
        })
        .where(eq(inbound_instructions.user_id, userId));
    } else {
      await db.insert(inbound_instructions).values({
        user_id: userId,
        first_message_prompt: data.first_message_prompt || null,
        role_prompt: data.role_prompt || null,
        context_prompt: data.context_prompt || null,
        task_prompt: data.task_prompt || null,
        specifics_prompt: data.specifics_prompt || null,
        conversation_flow_prompt: data.conversation_flow_prompt || null,
        sample_dialogue_prompt: data.sample_dialogue_prompt || null,
        key_points_prompt: data.key_points_prompt || null,
        after_call_prompt: data.after_call_prompt || null,
        link_prompt: data.link_prompt || null,
      });
    }

    return NextResponse.json({ 
      success: true,
      message: "Inbound prompts saved successfully!" 
    });
  } catch (error) {
    console.error("Error saving inbound instructions:", error);
    return NextResponse.json(
      { error: "Failed to save inbound prompts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}