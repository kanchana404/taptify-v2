import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import db from "@/db/drizzle";
import { users, companyData, extra_details, reviewLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Debug DB endpoint called for user:", userId);

    // Test database connection
    try {
      // Check if user exists
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      console.log("User found:", user ? "yes" : "no");

      if (user) {
        // Check company data
        const [company] = await db.select().from(companyData).where(eq(companyData.user_id, userId)).limit(1);
        console.log("Company data found:", company ? "yes" : "no");
        if (company) {
          console.log("Company data:", company);
        }

        // Check extra details
        const [extra] = await db.select().from(extra_details).where(eq(extra_details.userid, userId)).limit(1);
        console.log("Extra details found:", extra ? "yes" : "no");
        if (extra) {
          console.log("Extra details:", extra);
        }

        // Check review links
        const [reviewLink] = await db.select().from(reviewLinks).where(eq(reviewLinks.user_id, userId)).limit(1);
        console.log("Review link found:", reviewLink ? "yes" : "no");
        if (reviewLink) {
          console.log("Review link:", reviewLink);
        }

        return NextResponse.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            org_id: user.org_id
          },
          company: company || null,
          extra: extra || null,
          reviewLink: reviewLink || null,
          message: "Database connection successful"
        });
      } else {
        return NextResponse.json({
          success: false,
          message: "User not found in database",
          userId
        });
      }
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({
        success: false,
        error: "Database connection failed",
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error in debug DB endpoint:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to process request",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}


