import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-04-30.basil",
  });

  const sig = request.headers.get("stripe-signature") as string;
  const endpointSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

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

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Connect webhook:', error);
    return new NextResponse('Error processing Connect webhook', { status: 500 });
  }
}

async function handleAsyncPaymentFailed(session: Stripe.Checkout.Session) {
  try {
    console.log('Connect async payment failed:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
      connectedAccountId: session.metadata?.connected_account_id
    });
  } catch (error) {
    console.error('Error handling Connect async payment failed:', error);
  }
}

async function handleAsyncPaymentSucceeded(session: Stripe.Checkout.Session) {
  try {
    console.log('Connect async payment succeeded:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
      connectedAccountId: session.metadata?.connected_account_id
    });
  } catch (error) {
    console.error('Error handling Connect async payment succeeded:', error);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Connect checkout completed:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      amount: session.amount_total,
      metadata: session.metadata,
      connectedAccountId: session.metadata?.connected_account_id
    });
  } catch (error) {
    console.error('Error handling Connect checkout completed:', error);
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  try {
    console.log('Connect checkout expired:', {
      sessionId: session.id,
      customerId: session.customer,
      paymentStatus: session.payment_status,
      metadata: session.metadata,
      connectedAccountId: session.metadata?.connected_account_id
    });
  } catch (error) {
    console.error('Error handling Connect checkout expired:', error);
  }
} 