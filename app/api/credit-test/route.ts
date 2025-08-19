import { NextRequest, NextResponse } from "next/server";
import { getAuth } from '@clerk/nextjs/server';

// In-memory storage for testing (in production, this would be in the database)
const creditBalances = new Map<string, number>();

export async function GET(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current balance (default to 0 if not found)
  const currentBalance = creditBalances.get(userId) || 0;
  
  return NextResponse.json({ 
    credits: currentBalance,
    message: "Test credit balance retrieved"
  });
}

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { credits } = await req.json();
    
    // Get current balance
    const currentBalance = creditBalances.get(userId) || 0;
    const newBalance = currentBalance + credits;
    
    // Update balance
    creditBalances.set(userId, newBalance);
    
    return NextResponse.json({ 
      success: true,
      message: `Added ${credits} credits to your account`,
      currentBalance: newBalance,
      creditsAdded: credits
    });
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to add credits",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 