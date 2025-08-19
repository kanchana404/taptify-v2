import { NextRequest, NextResponse } from "next/server";
import { getAuth, currentUser } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { packages, users, teams } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createUser } from "@/actions/UserAction";
import Stripe from "stripe";
import { orgMembersSubscription } from "@/db/schema";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { packageId } = await req.json();

    if (!packageId) {
      return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
    }

    let actualUserId = userId;
    let userOrgId: number | null = null;
    
    // Check if user exists in database, create if not
    const existingUser = await db
      .select({ org_id: users.org_id })
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
        userOrgId = createdUser.org_id;
      } catch (error) {
        console.error(`Error creating user ${userId}:`, error);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
    } else {
      userOrgId = existingUser[0].org_id;
    }

    console.log(`Processing purchase for user ${actualUserId} with org_id: ${userOrgId}`);

    // Get user details with team information
    const userWithTeam = await db
      .select({
        org_id: users.org_id,
        clerk_org_id: teams.clerk_org_id,
        email: users.email
      })
      .from(users)
      .leftJoin(teams, eq(teams.id, users.org_id))
      .where(eq(users.id, actualUserId))
      .limit(1);

    console.log("User with team query result:", userWithTeam);

    if (userWithTeam.length === 0) {
      console.error("User not found after creation. User data:", userWithTeam);
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }

    const userData = userWithTeam[0];
    console.log("User data:", userData);

    // Get package details
    const packageDetails = await db
      .select()
      .from(packages)
      .where(eq(packages.id, packageId))
      .limit(1);

    if (packageDetails.length === 0) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const packageData = packageDetails[0];
    console.log("Package data:", packageData);

    // Check if package has a price_id
    if (!packageData.price_id) {
      console.log('Package does not have a price_id:', packageData);
      return NextResponse.json({ error: 'Package is not configured for payment' }, { status: 400 });
    }

    // Initialize Stripe with the main account
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-04-30.basil",
    });

    // First, get the price details to determine if it's recurring or one-time
    const price = await stripe.prices.retrieve(packageData.price_id);
    console.log('Price details:', {
      id: price.id,
      type: price.type,
      recurring: price.recurring,
      unit_amount: price.unit_amount
    });

    // Determine the mode based on whether the price is recurring
    const mode = price.recurring ? 'subscription' : 'payment';
    console.log('Using mode:', mode);

    // Prepare the checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      line_items: [
        {
          price: packageData.price_id,
          quantity: 1,
        },
      ],
      mode: mode,
              success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://voice.taptify.com'}/payment-success?session_id={CHECKOUT_SESSION_ID}&package_id=${packageId}&credits=${packageData.credit_count}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://voice.taptify.com'}/packages`,
      client_reference_id: actualUserId,
    };

    // Add customer email if available
    if (userData.email) {
      sessionParams.customer_email = userData.email;
      console.log('Adding customer email to checkout:', userData.email);
    }

    // Add metadata based on mode
    if (mode === 'payment') {
      sessionParams.metadata = {
        package_id: packageId.toString(),
        user_id: actualUserId,
        org_id: userData.org_id?.toString() || '',
        package_name: packageData.name,
        credit_count: packageData.credit_count.toString(),
        sms_count: packageData.sms_count.toString(),
      };
    } else {
      // For subscription mode, we need to pass metadata to the subscription
      sessionParams.subscription_data = {
        metadata: {
          package_id: packageId.toString(),
          user_id: actualUserId,
          org_id: userData.org_id?.toString() || '',
          package_name: packageData.name,
          credit_count: packageData.credit_count.toString(),
          sms_count: packageData.sms_count.toString(),
        },
      };
    }

    // Create checkout session using the main Stripe account
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Checkout session created:', session.id);

    // For subscriptions, create a pending record in the database
    if (mode === 'subscription') {
      try {
        await db
          .insert(orgMembersSubscription)
          .values({
            user_id: actualUserId,
            org_id: userData.org_id || 0,
            package_id: packageId,
            stripe_subscription_id: null, // Will be updated when webhook confirms
            stripe_customer_id: null,     // Will be updated when webhook confirms
            stripe_price_id: packageData.price_id,
            status: 'pending',            // Will be updated to 'active' when webhook confirms
            current_period_start: null,   // Will be updated when webhook confirms
            current_period_end: null,     // Will be updated when webhook confirms
            metadata: JSON.stringify({
              package_name: packageData.name,
              credit_count: packageData.credit_count,
              sms_count: packageData.sms_count,
              user_id: actualUserId,
              checkout_session_id: session.id
            }),
            created_at: new Date(),
            updated_at: new Date()
          });
        
        console.log(`Created pending subscription record for user ${actualUserId}`);
      } catch (error) {
        console.error('Error creating pending subscription record:', error);
        // Don't fail the checkout if this fails
      }
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      packageId: packageId
    });

  } catch (error) {
    console.error("Error processing package purchase:", error);
    return NextResponse.json(
      { error: "Failed to process package purchase" },
      { status: 500 }
    );
  }
}
