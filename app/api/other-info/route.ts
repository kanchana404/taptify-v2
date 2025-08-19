import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import db from '@/db/drizzle';
import { eq } from 'drizzle-orm';
import { qrCodeSettings, users } from '@/db/schema';

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user exists in the DB - but don't return 404 for new users
    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // If user doesn't exist in DB yet, return default settings instead of 404
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, returning default QR settings`);
      return NextResponse.json({
        qr_instruction_text: 'Scan this QR code to access our review form'
      });
    }

    // Fetch QR code settings
    const settings = await db
      .select({
        qr_instruction_text: qrCodeSettings.qr_instruction_text,
      })
      .from(qrCodeSettings)
      .where(eq(qrCodeSettings.user_id, userId))
      .limit(1);

    if (!settings.length) {
      // If no settings exist, create default
      const newSettings = await db
        .insert(qrCodeSettings)
        .values({
          user_id: userId,
          qr_instruction_text: 'Scan this QR code to access our review form',
        })
        .returning({
          qr_instruction_text: qrCodeSettings.qr_instruction_text,
        });

      return NextResponse.json(newSettings[0]);
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error('Error fetching QR code settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user exists in the DB - but don't return 404 for new users
    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    // If user doesn't exist in DB yet, still allow them to create settings
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, but allowing QR settings creation`);
    }

    const body = await req.json();
    const { qr_instruction_text } = body;

    if (!qr_instruction_text || typeof qr_instruction_text !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing qr_instruction_text' }, { status: 400 });
    }

    // Check if settings exist
    const existingSettings = await db
      .select()
      .from(qrCodeSettings)
      .where(eq(qrCodeSettings.user_id, userId))
      .limit(1);

    let updatedSettings;
    if (existingSettings.length) {
      // Update existing settings
      updatedSettings = await db
        .update(qrCodeSettings)
        .set({
          qr_instruction_text,
          updated_at: new Date(),
        })
        .where(eq(qrCodeSettings.user_id, userId))
        .returning({
          qr_instruction_text: qrCodeSettings.qr_instruction_text,
        });
    } else {
      // Insert new settings
      updatedSettings = await db
        .insert(qrCodeSettings)
        .values({
          user_id: userId,
          qr_instruction_text,
        })
        .returning({
          qr_instruction_text: qrCodeSettings.qr_instruction_text,
        });
    }

    return NextResponse.json(updatedSettings[0]);
  } catch (error) {
    console.error('Error updating QR code settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}