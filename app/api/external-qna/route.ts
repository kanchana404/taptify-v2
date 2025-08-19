// app/api/external-qna/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/oauth-utils';

export async function POST(request: NextRequest) {
  try {
    console.log('Q&A creation API called');
    
    // Parse JSON body
    const body = await request.json();
    
    // Extract data for Q&A
    const {
      question,
      answer,
      accountName,
      locationName,
      userId
    } = body;

    // Validate required fields for Q&A
    if (!question) {
      return NextResponse.json(
        { error: 'Question is required for Q&A' },
        { status: 400 }
      );
    }

    if (!answer) {
      return NextResponse.json(
        { error: 'Answer is required for Q&A' },
        { status: 400 }
      );
    }

    if (!accountName || !locationName) {
      return NextResponse.json(
        { error: 'Account name and location name are required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required to access Google Business account' },
        { status: 400 }
      );
    }

    // Get valid access token from database
    const accessToken = await getValidAccessToken(userId);
    
    if (!accessToken) {
      console.log('No valid access token found for user:', userId);
      return NextResponse.json(
        { error: 'Google account not connected for the specified user' },
        { status: 401 }
      );
    }

    console.log('Access token found, processing Q&A creation...');

    // Extract location ID from locationName
    let locationId;
    if (locationName.includes('locations/')) {
      locationId = locationName.replace('locations/', '');
    } else {
      locationId = locationName;
    }

    console.log('Location ID for Q&A creation:', locationId);

    // First, create the question
    const questionData = {
      text: question
    };

    console.log('Creating question with data:', JSON.stringify(questionData, null, 2));

    // Create the question using Google My Business Q&A API
    const questionUrl = `https://mybusinessqanda.googleapis.com/v1/locations/${locationId}/questions`;
    
    console.log('Creating question at URL:', questionUrl);

    const questionResponse = await fetch(questionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(questionData),
    });

    console.log('Question creation response status:', questionResponse.status);

    if (!questionResponse.ok) {
      const errorText = await questionResponse.text();
      console.error('Google API error response for question:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to create question',
          details: errorText,
          status: questionResponse.status
        },
        { status: questionResponse.status }
      );
    }

    const questionResult = await questionResponse.json();
    console.log('Question created successfully:', questionResult);

    // Now create the answer for the question
    const answerData = {
      answer: {
        text: answer
      }
    };

    console.log('Creating answer with data:', JSON.stringify(answerData, null, 2));

    // Create the answer using the upsert endpoint
    const answerUrl = `https://mybusinessqanda.googleapis.com/v1/${questionResult.name}/answers:upsert`;
    
    console.log('Creating answer at URL:', answerUrl);

    const answerResponse = await fetch(answerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(answerData),
    });

    console.log('Answer creation response status:', answerResponse.status);

    if (!answerResponse.ok) {
      const errorText = await answerResponse.text();
      console.error('Google API error response for answer:', errorText);
      return NextResponse.json(
        { 
          error: 'Failed to create answer',
          details: errorText,
          status: answerResponse.status
        },
        { status: answerResponse.status }
      );
    }

    const answerResult = await answerResponse.json();
    console.log('Answer created successfully:', answerResult);

    return NextResponse.json({
      success: true,
      message: 'Q&A created successfully',
      qna: {
        question: questionResult,
        answer: answerResult
      }
    });

  } catch (error) {
    console.error('Error creating Q&A:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method to check API status
export async function GET() {
  return NextResponse.json({
    status: 'External Q&A API is running',
    version: '1.0.0',
    endpoints: {
      'POST': '/api/external-qna - Create a new Google Business Q&A'
    },
    requiredFields: ['question', 'answer', 'accountName', 'locationName', 'userId'],
    example: {
      question: 'What are your business hours?',
      answer: 'We are open Monday to Friday from 9 AM to 6 PM.',
      accountName: 'accounts/123456789',
      locationName: 'locations/987654321',
      userId: 'user_123'
    },
    note: 'This endpoint creates actual Google Business Q&A entries, not posts.'
  });
} 