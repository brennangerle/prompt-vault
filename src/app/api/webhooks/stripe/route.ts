import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/config';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutSessionCompleted(session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(failedInvoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // TODO: Update user's subscription status in your database
  console.log('Checkout session completed:', session.id);
  console.log('Customer:', session.customer);
  console.log('Subscription:', session.subscription);
  console.log('User ID from metadata:', session.metadata?.userId);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  // TODO: Update subscription details in your database
  console.log('Subscription changed:', subscription.id);
  console.log('Status:', subscription.status);
  console.log('Current period end:', new Date(subscription.current_period_end * 1000));
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // TODO: Update user's subscription status to canceled in your database
  console.log('Subscription deleted:', subscription.id);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // TODO: Update payment status, extend subscription period if needed
  console.log('Invoice payment succeeded:', invoice.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // TODO: Send email to customer, update subscription status
  console.log('Invoice payment failed:', invoice.id);
}