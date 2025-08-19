import { NextRequest, NextResponse } from "next/server";
import db from "@/db/drizzle";
import { packages } from "@/db/schema";

export async function GET(req: NextRequest) {
  try {
    // Get packages from database
    const packagesData = await db
      .select()
      .from(packages);

    // Convert price to number for each package and ensure all fields are included
    const formattedPackages = packagesData.map(pkg => ({
      ...pkg,
      price: Number(pkg.price),
      credit_count: pkg.credit_count || 0,
      sms_count: pkg.sms_count || 0
    }));

    return NextResponse.json({ packages: formattedPackages });
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
} 