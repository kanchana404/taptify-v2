// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import db from "@/db/drizzle";
import { orgMembersSubscription, companyData } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-04-30.basil",
  });

  const sig = request.headers.get("stripe-signature") as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const buf = await request.arrayBuffer();
  const rawBody = Buffer.from(buf);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.async_payment_failed':
        const checkoutSessionAsyncPaymentFailed = event.data.object as Stripe.Checkout.Session;
        await handleAsyncPaymentFailed(checkoutSessionAsyncPaymentFailed);
        break;

      case 'checkout.session.async_payment_succeeded':
        const checkoutSessionAsyncPaymentSucceeded = event.data.object as Stripe.Checkout.Session;
        await handleAsyncPaymentSucceeded(checkoutSessionAsyncPaymentSucceeded);
        break;

      case 'checkout.session.completed':
        const checkoutSessionCompleted = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(checkoutSessionCompleted);
        break;

      case 'checkout.session.expired':
        const checkoutSessionExpired = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(checkoutSessionExpired);
        break;

      case 'invoice.payment_succeeded':
        const invoicePaymentSucceeded = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoicePaymentSucceeded, stripe);
        break;

      case 'customer.subscription.created':
        const customerSubscriptionCreated = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(customerSubscriptionCreated);
        break;

      case 'customer.subscription.updated':
        const customerSubscriptionUpdated = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(customerSubscriptionUpdated);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Error processing webhook', { status: 500 });
  }
}

async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  try {
    console.log('Async payment failed:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error('Error handling async payment failed:', error);
  }
}

async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  try {
    console.log('Async payment succeeded:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error('Error handling async payment succeeded:', error);
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  try {
    console.log('Checkout expired:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error('Error handling checkout expired:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Checkout completed:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      amount: session.amount_total,
      metadata: session.metadata
    });

    // Only process if payment was successful
    if (session.payment_status === 'paid') {
      const metadata = session.metadata;
      
      if (metadata?.user_id && metadata?.credit_count) {
        await addCreditsToUser(metadata.user_id, parseInt(metadata.credit_count));
        console.log(`Successfully added ${metadata.credit_count} credits to user ${metadata.user_id}`);
      }
    }
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, stripe: Stripe) {
  try {
    console.log('Invoice payment succeeded:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      subscriptionId: invoice.subscription,
      amount: invoice.amount_paid,
      metadata: invoice.metadata
    });

    // For subscription payments, we need to get the subscription details
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const metadata = subscription.metadata;
      
      if (metadata?.user_id && metadata?.credit_count) {
        await addCreditsToUser(metadata.user_id, parseInt(metadata.credit_count));
        console.log(`Successfully added ${metadata.credit_count} credits to user ${metadata.user_id} from subscription payment`);
      }
    }
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription created:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata
    });

    // Store subscription data in org_members_subscription table
    if (subscription.metadata?.user_id && subscription.metadata?.package_id && subscription.metadata?.org_id) {
      try {
        const [newSubscription] = await db
          .insert(orgMembersSubscription)
          .values({
            user_id: subscription.metadata.user_id,
            org_id: parseInt(subscription.metadata.org_id),
            package_id: parseInt(subscription.metadata.package_id),
            stripe_subscription_id: subscription.id,
            stripe_customer_id: subscription.customer as string,
            stripe_price_id: subscription.items.data[0]?.price.id || '',
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            quantity: subscription.items.data[0]?.quantity || 1,
            metadata: JSON.stringify(subscription.metadata),
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning();

        console.log(`Subscription data stored in database with ID: ${newSubscription.id}`);
      } catch (dbError) {
        console.error('Error storing subscription in database:', dbError);
      }
    }

    // Add credits when subscription is created (for initial payment)
    if (subscription.status === 'active') {
      const metadata = subscription.metadata;
      
      console.log('Subscription metadata for credit addition:', metadata);
      
      if (metadata?.user_id && metadata?.credit_count) {
        console.log(`Adding ${metadata.credit_count} credits to user ${metadata.user_id}`);
        await addCreditsToUser(metadata.user_id, parseInt(metadata.credit_count));
        console.log(`Successfully added ${metadata.credit_count} credits to user ${metadata.user_id} from new subscription`);
      } else {
        console.log('Missing user_id or credit_count in subscription metadata:', metadata);
      }
    }
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Subscription updated:', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status,
      metadata: subscription.metadata
    });

    // Update subscription data in org_members_subscription table
    if (subscription.metadata?.user_id) {
      try {
        await db
          .update(orgMembersSubscription)
          .set({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000),
            current_period_end: new Date(subscription.current_period_end * 1000),
            cancel_at_period_end: subscription.cancel_at_period_end,
            canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
            updated_at: new Date()
          })
          .where(eq(orgMembersSubscription.stripe_subscription_id, subscription.id));

        console.log(`Subscription data updated in database for subscription: ${subscription.id}`);
      } catch (dbError) {
        console.error('Error updating subscription in database:', dbError);
      }
    }

    // Handle subscription status changes
    if (subscription.status === 'active') {
      const metadata = subscription.metadata;
      
      if (metadata?.user_id && metadata?.credit_count) {
        await addCreditsToUser(metadata.user_id, parseInt(metadata.credit_count));
        console.log(`Successfully added ${metadata.credit_count} credits to user ${metadata.user_id} from subscription update`);
      }
    }
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function addCreditsToUser(userId: string, creditAmount: number) {
  try {
    console.log(`Adding ${creditAmount} credits to user ${userId}`);
    
    // First, check if the user has existing company data
    const existingCompanyData = await db
      .select()
      .from(companyData)
      .where(eq(companyData.user_id, userId))
      .limit(1);

    console.log(`Found existing company data for user ${userId}:`, existingCompanyData);

    if (existingCompanyData.length > 0) {
      // Update existing record by adding to current credits
      const currentCredits = existingCompanyData[0].credits || 0;
      const newCredits = currentCredits + creditAmount;
      
      await db
        .update(companyData)
        .set({ 
          credits: newCredits,
          updated_at: new Date()
        })
        .where(eq(companyData.user_id, userId));
        
      console.log(`Updated user ${userId} credits from ${currentCredits} to ${newCredits}`);
    } else {
      // Create new company data record
      await db
        .insert(companyData)
        .values({
          user_id: userId,
          credits: creditAmount,
          created_at: new Date(),
          updated_at: new Date()
        });
        
      console.log(`Created new company data for user ${userId} with ${creditAmount} credits`);
    }
  } catch (error) {
    console.error('Error adding credits to user:', error);
    throw error;
  }
}
