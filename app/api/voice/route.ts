// app/api/voice/route.ts - Fixed to show all voices
import { NextRequest, NextResponse } from 'next/server';
import { getAuth, currentUser } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { qrCodeSettings, users } from '@/db/schema';
import { ElevenLabsClient } from "elevenlabs";
import { createUser } from "@/actions/UserAction";

// Initialize ElevenLabs client with API key
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check if the user wants all voices or just their voice setting
    const url = new URL(req.url);
    const getAllVoices = url.searchParams.get('all') === 'true';

    if (getAllVoices) {
      try {
        // Check if API key is available
        if (!ELEVENLABS_API_KEY) {
          console.error('ElevenLabs API key is not configured');
          return NextResponse.json({ 
            error: 'ElevenLabs API key is not configured',
            details: 'Please add ELEVENLABS_API_KEY to your environment variables'
          }, { status: 500 });
        }

        // Initialize client
        console.log('Initializing ElevenLabs client');
        const client = new ElevenLabsClient({ 
          apiKey: ELEVENLABS_API_KEY
        });

        // Attempt to use a direct API call to get all voices
        // This bypasses potential limitations in the SDK or ensures we get all available voices
        const directResponse = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY
          }
        });
        
        if (!directResponse.ok) {
          throw new Error(`Direct API call failed with status: ${directResponse.status}`);
        }
        
        const directData = await directResponse.json();
        console.log(`Fetched ${directData.voices?.length || 0} voices directly from ElevenLabs API`);
        
        // Format the voice data to match the structure expected by the frontend
        const formattedVoices = directData.voices.map((voice: any) => ({
          id: voice.voice_id,
          name: voice.name,
          provider: "11LABS",
          bestFor: voice.labels ? [voice.labels.use_case, voice.labels.descriptive, voice.labels.accent].filter(Boolean) : [],
          image: voice.sharing?.image_url || "/api/placeholder/280/280",
          previewUrl: voice.preview_url,
          price: 0.036,
          speed: 400,
          description: voice.description || "",
          gender: voice.labels?.gender || "unknown",
          age: voice.labels?.age || "unknown",
          accent: voice.labels?.accent || "unknown",
          useCase: voice.labels?.use_case || "unknown",
          descriptive: voice.labels?.descriptive || "unknown",
        }));
        
        return NextResponse.json({
          voices: formattedVoices,
          total_count: directData.voices.length
        });
      } catch (error) {
        // More detailed error logging
        console.error('Error fetching ElevenLabs voices:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        return NextResponse.json({ 
          error: 'Failed to fetch voices from ElevenLabs',
          details: errorMessage
        }, { status: 500 });
      }
    } else {
      // Get user's voice settings
      const [userSettings] = await db
        .select()
        .from(qrCodeSettings)
        .where(eq(qrCodeSettings.user_id, actualUserId))
        .limit(1);

      if (!userSettings) {
        // Return default settings if user doesn't have any
        return NextResponse.json({
          id: null,
          user_id: actualUserId,
          qr_instruction_text: 'Scan this QR code to access our review form',
          voice_id: null,
          voice_name: null,
          created_at: null,
          updated_at: null
        });
      }

      return NextResponse.json(userSettings);
    }
  } catch (error) {
    console.error('Error in GET /api/voice:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST and PATCH methods remain the same
export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const body = await req.json();
    const { voice_id, voice_name } = body;

    if (!voice_id) {
      return NextResponse.json(
        { error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    // Check if the user already has QR code settings
    const existingSettings = await db
      .select()
      .from(qrCodeSettings)
      .where(eq(qrCodeSettings.user_id, actualUserId))
      .limit(1);

    if (existingSettings.length) {
      // Update existing settings
      await db
        .update(qrCodeSettings)
        .set({
          voice_id,
          voice_name,
          updated_at: new Date(),
        })
        .where(eq(qrCodeSettings.user_id, actualUserId));

      return NextResponse.json({
        message: 'Voice settings updated successfully',
        voice_id,
        voice_name,
      });
    } else {
      // Create new settings
      const defaultInstructionText = 'Scan this QR code to access our review form';
      
      await db.insert(qrCodeSettings).values({
        user_id: actualUserId,
        qr_instruction_text: defaultInstructionText,
        voice_id,
        voice_name,
        created_at: new Date(),
        updated_at: new Date()
      });

      return NextResponse.json({
        message: 'Voice settings created successfully',
        voice_id,
        voice_name,
      });
    }
  } catch (error) {
    console.error('Error saving voice settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: errorMessage
    }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const body = await req.json();
    const { voice_id, voice_name } = body;

    if (!voice_id) {
      return NextResponse.json(
        { error: 'Voice ID is required' },
        { status: 400 }
      );
    }

    // Check if the user has QR code settings
    const existingSettings = await db
      .select()
      .from(qrCodeSettings)
      .where(eq(qrCodeSettings.user_id, actualUserId))
      .limit(1);

    if (!existingSettings.length) {
      return NextResponse.json(
        { error: 'QR code settings not found for this user' },
        { status: 404 }
      );
    }

    // Update the voice settings
    await db
      .update(qrCodeSettings)
      .set({
        voice_id,
        voice_name,
        updated_at: new Date(),
      })
      .where(eq(qrCodeSettings.user_id, actualUserId));

    return NextResponse.json({
      message: 'Voice settings updated successfully',
      voice_id,
      voice_name,
    });
  } catch (error) {
    console.error('Error updating voice settings:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: errorMessage
    }, { status: 500 });
  }
}