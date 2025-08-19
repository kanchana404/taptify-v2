import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(file: Buffer, fileName: string, contentType: string): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET!;
  const key = `uploads/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: contentType,
      // ACL: 'public-read', // Removed for Bucket owner enforced
    })
  );

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
