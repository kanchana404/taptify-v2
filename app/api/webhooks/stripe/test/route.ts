import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Test webhook received:', {
      type: body.type,
      id: body.id,
      created: body.created,
      data: body.data
    });

    return NextResponse.json({ 
      received: true,
      message: "Test webhook processed successfully"
    });
  } catch (error) {
    console.error('Error processing test webhook:', error);
    return new NextResponse('Error processing test webhook', { status: 500 });
  }
} 