import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { eq } from 'drizzle-orm'
import { reviewLinks, users, companyData } from '@/db/schema'

export async function GET(req: NextRequest) {
  try {
    // Get the user ID from Clerk auth
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the user exists in the DB - but don't return 404 for new users
    const foundUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    // If user doesn't exist in DB yet, return default data instead of 404
    if (!foundUser.length) {
      console.log(`User ${userId} not found in database, returning default QR data`);
      return NextResponse.json({
        url: "https://yourcompany.com/feedback",
        businessName: "Your Business"
      });
    }

    // Get the review link for the current user
    const links = await db
      .select()
      .from(reviewLinks)
      .where(eq(reviewLinks.user_id, userId))
      .limit(1)

    // Get company data for the user
    const companyInfo = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, userId))
      .limit(1)

    let url = "https://yourcompany.com/feedback"; // Default URL
    let businessName = "Your Business"; // Default business name

    // If user has set a custom review link URL, use that
    if (links && links.length > 0 && links[0].review_link_url) {
      url = links[0].review_link_url;
      businessName = links[0].business_name || "Your Business";
    } else if (companyInfo && companyInfo.length > 0 && companyInfo[0].company_name) {
      // If no custom URL is set, generate URL using company name
      const companyName = companyInfo[0].company_name;
      // Create a URL-friendly version of the company name
      const urlFriendlyName = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      url = `https://${urlFriendlyName}.review.com/feedback`;
      businessName = companyName;
    }

    return NextResponse.json({
      url: url,
      businessName: businessName
    })
  } catch (error) {
    console.error('Error fetching QR code data:', error)
    return NextResponse.json({ 
      error: "Failed to fetch QR code data",
      url: "https://yourcompany.com/feedback",
      businessName: "Your Business"
    }, { status: 200 }) // Return 200 with defaults even on error to prevent UI breaking
  }
}