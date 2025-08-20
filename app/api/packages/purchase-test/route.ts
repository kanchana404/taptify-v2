import { NextRequest, NextResponse } from "next/server";
import { getAuth } from '@clerk/nextjs/server';
import db from "@/db/drizzle";
import { packages, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the package ID from the request body
    const { packageId } = await req.json();
    
    console.log('Test purchase request:', { userId, packageId });

    // Get user's email
    const user = await db
      .select({
        email: users.email
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    console.log('User query result:', user);

    // Get the package details from database
    const packageDetails = await db
      .select()
      .from(packages)
      .where(eq(packages.id, packageId))
      .limit(1);

    console.log('Package details query result:', packageDetails);
    
    if (!packageDetails.length) {
      console.log('Package not found for ID:', packageId);
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Check if package has a price_id
    if (!packageDetails[0].price_id) {
      console.log('Package does not have a price_id:', packageDetails[0]);
      return NextResponse.json({ error: 'Package is not configured for payment' }, { status: 400 });
    }

    // Initialize Stripe with the main account
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-04-30.basil",
    });

    // First, get the price details to determine if it's recurring or one-time
    const price = await stripe.prices.retrieve(packageDetails[0].price_id);
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
          price: packageDetails[0].price_id,
          quantity: 1,
        },
      ],
      mode: mode,
              success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://beta.taptify.com'}/payment-success?session_id={CHECKOUT_SESSION_ID}&package_id=${packageId}&credits=${packageDetails[0].credit_count}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://beta.taptify.com'}/packages`,
      client_reference_id: userId,
    };

    // Add customer email if available
    if (user.length > 0 && user[0].email) {
      sessionParams.customer_email = user[0].email;
      console.log('Adding customer email to checkout:', user[0].email);
    }

    // Add metadata based on mode
    if (mode === 'payment') {
      sessionParams.metadata = {
        package_id: packageId.toString(),
        user_id: userId,
        package_name: packageDetails[0].name,
        credit_count: packageDetails[0].credit_count.toString(),
        sms_count: packageDetails[0].sms_count.toString(),
      };
    } else {
      // For subscription mode, we need to pass metadata to the subscription
      sessionParams.subscription_data = {
        metadata: {
          package_id: packageId.toString(),
          user_id: userId,
          package_name: packageDetails[0].name,
          credit_count: packageDetails[0].credit_count.toString(),
          sms_count: packageDetails[0].sms_count.toString(),
        },
      };
    }

    // Create checkout session using the main Stripe account
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('Test checkout session created:', session.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      packageId: packageId
    });

  } catch (error: any) {
    console.error("Error creating test checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create test checkout session", details: error.message },
      { status: 500 }
    );
  }
} 