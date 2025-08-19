// app/api/link-protect/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { reviewLinks, companyData } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

const baseUrl = process.env.BASE_URL || 'https://voice.taptify.com';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Helper function to upload image to S3
async function uploadImageToS3(base64Image: string, userId: string, imageType: 'header' | 'preview'): Promise<string> {
  const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 image string');
  }
  
  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  
  const fileExtension = contentType.split('/')[1];
  const fileName = `${userId}/${imageType}_${uuidv4()}.${fileExtension}`;
  
  const bucketName = process.env.AWS_S3_BUCKET;
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET environment variable is not set');
  }

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: buffer,
    ContentType: contentType,
  };
  
  await s3Client.send(new PutObjectCommand(params));
  
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
}

// GET endpoint to retrieve current settings or check URL availability
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const checkUrl = url.searchParams.get('checkUrl');

  if (checkUrl) {
    try {
      // Extract only the path part for checking
      let pathToCheck = checkUrl;
      
      // If it's a full URL, extract just the path
      if (checkUrl.startsWith('http')) {
        try {
          const url = new URL(checkUrl);
          pathToCheck = url.pathname.substring(1); // Remove leading slash
        } catch (e) {
          // If URL parsing fails, use as is
          pathToCheck = checkUrl;
        }
      } else {
        // If it's already a path, clean it up
        pathToCheck = checkUrl.replace(/^\/+/, '');
      }
      
      const existingLink = await db
        .select()
        .from(reviewLinks)
        .where(
          and(
            eq(reviewLinks.review_link_url, pathToCheck), // Check against the path
            ne(reviewLinks.user_id, userId) // Check if URL is used by a different user
          )
        )
        .limit(1);

      return NextResponse.json({
        isAvailable: existingLink.length === 0,
        message: existingLink.length > 0 ? 'This URL is already in use by another user. Please choose a different one.' : 'URL is available'
      });
    } catch (error) {
      console.error("Error checking review link availability:", error);
      return NextResponse.json(
        { error: "Failed to check review link availability" },
        { status: 500 }
      );
    }
  }

  try {
    // Get company data for the user
    const companyInfo = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, userId))
      .limit(1);

    const settings = await db
      .select()
      .from(reviewLinks)
      .where(eq(reviewLinks.user_id, userId))
      .limit(1);

    if (!settings.length) {
      // Use company name from company_data if available, otherwise use empty string
      const defaultBusinessName = companyInfo.length > 0 && companyInfo[0].company_name 
        ? companyInfo[0].company_name 
        : "";
      
      // Create URL-friendly slug from company name
      const createSlug = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };
      
      const defaultPath = companyInfo.length > 0 && companyInfo[0].company_name
        ? createSlug(companyInfo[0].company_name)
        : userId;
      
      // Construct full URL for display purposes
      const displayUrl = `${baseUrl}/${defaultPath}`;
      
      return NextResponse.json({
        review_link_url: displayUrl,
        review_title: "How was your experience?",
        star_filter_enabled: true,
        star_threshold: 3,
        show_powered_by: true,
        business_name: defaultBusinessName,
        header_image_url: "",
        preview_icon_url: "",
        positive_feedback_text: "Leave us a review, it will help us grow and better serve our customers like you.",
        negative_feedback_text: "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.",
      });
    }

    // If settings exist but business_name is empty, try to get it from company_data
    let result = settings[0];
    if (!result.business_name && companyInfo.length > 0 && companyInfo[0].company_name) {
      result = {
        ...result,
        business_name: companyInfo[0].company_name
      };
    }
    
    // Construct full URL for display if we have a path stored
    if (result.review_link_url && !result.review_link_url.startsWith('http')) {
      result = {
        ...result,
        review_link_url: `${baseUrl}/${result.review_link_url}`
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching review link settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch review link settings" },
      { status: 500 }
    );
  }
}

// POST endpoint to create or update settings
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {

    const body = await req.json();
    let {
      review_link_url,
      review_title,
      star_filter_enabled,
      star_threshold,
      show_powered_by,
      business_name,
      header_image_url,
      preview_icon_url,
      positive_feedback_text,
      negative_feedback_text,
    } = body;

    const existingSettings = await db
      .select()
      .from(reviewLinks)
      .where(eq(reviewLinks.user_id, userId))
      .limit(1);

    if (review_link_url) {
      // Extract only the path part for storage, not the full URL
      let pathToStore = review_link_url;
      
      // If it's a full URL, extract just the path
      if (review_link_url.startsWith('http')) {
        try {
          const url = new URL(review_link_url);
          pathToStore = url.pathname.substring(1); // Remove leading slash
        } catch (e) {
          // If URL parsing fails, use as is
          pathToStore = review_link_url;
        }
      } else {
        // If it's already a path, clean it up
        pathToStore = review_link_url.replace(/^\/+/, '');
      }
      
      // Construct the full URL for availability checking
      const fullUrl = `${baseUrl}/${pathToStore}`;
      
      // Check if this URL is used by another user (not the current user)
      const existingLink = await db
        .select()
        .from(reviewLinks)
        .where(
          and(
            eq(reviewLinks.review_link_url, pathToStore), // Check against the path, not full URL
            ne(reviewLinks.user_id, userId) // Check if URL is used by a different user
          )
        )
        .limit(1);

      if (existingLink.length > 0) {
        return NextResponse.json(
          { error: "This URL is already in use by another user. Please choose a different one." },
          { status: 409 }
        );
      }
      
      // Store only the path in the database
      review_link_url = pathToStore;
    }

    const now = new Date();
    
    if (header_image_url && header_image_url.startsWith('data:image')) {
      try {
        header_image_url = await uploadImageToS3(header_image_url, userId, 'header');
      } catch (error) {
        console.error('Error uploading header image to S3:', error);
        let errorMessage = "Failed to upload header image";
        if (error instanceof Error) {
          if (error.message.includes('NoSuchBucket')) {
            errorMessage = "S3 bucket not found. Please check your AWS_S3_BUCKET environment variable.";
          } else if (error.message.includes('AWS_S3_BUCKET')) {
            errorMessage = "AWS_S3_BUCKET environment variable is not configured.";
          } else {
            errorMessage = `Failed to upload header image: ${error.message}`;
          }
        }
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        );
      }
    }
    
    if (preview_icon_url && preview_icon_url.startsWith('data:image')) {
      try {
        preview_icon_url = await uploadImageToS3(preview_icon_url, userId, 'preview');
      } catch (error) {
        console.error('Error uploading Preview logo to S3:', error);
        let errorMessage = "Failed to upload Preview logo";
        if (error instanceof Error) {
          if (error.message.includes('NoSuchBucket')) {
            errorMessage = "S3 bucket not found. Please check your AWS_S3_BUCKET environment variable.";
          } else if (error.message.includes('AWS_S3_BUCKET')) {
            errorMessage = "AWS_S3_BUCKET environment variable is not configured.";
          } else {
            errorMessage = `Failed to upload Preview logo: ${error.message}`;
          }
        }
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        );
      }
    }

    if (!positive_feedback_text) {
      positive_feedback_text = "Leave us a review, it will help us grow and better serve our customers like you.";
    }
    
    if (!negative_feedback_text) {
      negative_feedback_text = "We want our customers to be 100% satisfied. Please let us know why you had a bad experience, so we can improve our service. Leave your email to be contacted.";
    }

    let result;
    if (existingSettings.length) {
      const updated = await db
        .update(reviewLinks)
        .set({
          review_link_url: review_link_url || existingSettings[0].review_link_url,
          review_title: review_title || existingSettings[0].review_title,
          star_filter_enabled: star_filter_enabled !== undefined ? star_filter_enabled : existingSettings[0].star_filter_enabled,
          star_threshold: star_threshold || existingSettings[0].star_threshold,
          show_powered_by: show_powered_by !== undefined ? show_powered_by : existingSettings[0].show_powered_by,
          business_name: business_name || existingSettings[0].business_name,
          header_image_url: header_image_url || existingSettings[0].header_image_url,
          preview_icon_url: preview_icon_url || existingSettings[0].preview_icon_url,
          positive_feedback_text: positive_feedback_text || existingSettings[0].positive_feedback_text,
          negative_feedback_text: negative_feedback_text || existingSettings[0].negative_feedback_text,
          updated_at: now,
        })
        .where(eq(reviewLinks.user_id, userId))
        .returning();

      result = updated[0];
    } else {
      // Get company data for default URL generation
      const companyInfo = await db
        .select()
        .from(companyData)
        .where(eq(companyData.user_id, userId))
        .limit(1);
      
      // Create URL-friendly slug from company name
      const createSlug = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      };
      
      const defaultPath = companyInfo.length > 0 && companyInfo[0].company_name
        ? createSlug(companyInfo[0].company_name)
        : userId;
      
      const inserted = await db
        .insert(reviewLinks)
        .values({
          user_id: userId,
          review_link_url: review_link_url || defaultPath,
          review_title: review_title || "How was your experience?",
          star_filter_enabled: star_filter_enabled !== undefined ? star_filter_enabled : true,
          star_threshold: star_threshold || 3,
          show_powered_by: show_powered_by !== undefined ? show_powered_by : true,
          business_name: business_name || "",
          header_image_url: header_image_url || "",
          preview_icon_url: preview_icon_url || "",
          positive_feedback_text: positive_feedback_text,
          negative_feedback_text: negative_feedback_text,
          created_at: now,
          updated_at: now,
        })
        .returning();

      result = inserted[0];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating review link settings:", error);
    return NextResponse.json(
      { error: "Failed to update review link settings" },
      { status: 500 }
    );
  }
}