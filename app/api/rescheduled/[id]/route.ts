import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { userbase } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Explicitly await the context.params to avoid the Next.js warning
    const params = await Promise.resolve(context.params);
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await req.json();
    
    // Update the userbase entry to set recallstatus to "canceled"
    await db
      .update(userbase)
      .set({ recallstatus: "canceled" })
      .where(
        and(
          eq(userbase.id, id),
          eq(userbase.user_id, userId) // Security check: ensure the user owns this record
        )
      );

    // For verification, try to find the record to confirm it was updated
    const verifyRecord = await db
      .select()
      .from(userbase)
      .where(
        and(
          eq(userbase.id, id),
          eq(userbase.user_id, userId)
        )
      )
      .limit(1);
    
    if (verifyRecord.length === 0) {
      return NextResponse.json(
        { error: "Record not found or not authorized to update" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error cancelling rescheduled call:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 }
    );
  }
}