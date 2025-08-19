import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    // Debug log for env variables
    console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID);
    console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '***' : undefined);
    console.log('AWS_REGION:', process.env.AWS_REGION);
    console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    // Validate file type (only allow PNG and JPEG)
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PNG and JPEG images are supported.' }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadToS3(buffer, file.name, file.type);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('S3 upload error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
