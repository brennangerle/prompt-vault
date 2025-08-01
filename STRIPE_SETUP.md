# Stripe Integration Setup Guide

This guide will help you set up Stripe for subscription payments in the application.

## Prerequisites

- A Stripe account (create one at https://stripe.com)
- Node.js and npm installed
- The application running locally

## Setup Steps

### 1. Configure Stripe Dashboard

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Test mode** (toggle in the top right)

### 2. Create Products and Prices

1. Go to **Products** in the Stripe Dashboard
2. Click **+ Add product** and create two products:

#### Pro Plan
- **Name**: Pro Plan
- **Description**: Perfect for professionals
- **Price**: $4.00 per month
- **Billing period**: Monthly
- **Price ID**: Copy this ID (starts with `price_`)

#### Max Plan
- **Name**: Max Plan  
- **Description**: For power users and teams
- **Price**: $10.00 per month
- **Billing period**: Monthly
- **Price ID**: Copy this ID (starts with `price_`)

### 3. Set Up Environment Variables

1. Copy `.env.local.example` to `.env.local`
2. Add your Stripe keys:

```bash
# Get these from https://dashboard.stripe.com/test/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Add the price IDs from step 2
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_MAX_PRICE_ID=price_...
```

### 4. Configure Webhooks

1. Install the Stripe CLI:
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Windows
   scoop install stripe

   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add it to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 5. Configure Customer Portal

1. Go to [Customer Portal settings](https://dashboard.stripe.com/test/settings/billing/portal)
2. Enable the features you want customers to access:
   - Update payment methods
   - Cancel subscriptions
   - Update subscriptions
   - View invoices
3. Save the configuration

### 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Make sure the Stripe CLI is forwarding webhooks (from step 4.3)

3. Visit `/pricing` and test the subscription flow with test card:
   - Card number: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

## Database Schema (TODO)

To fully integrate Stripe, you'll need to update your database schema to track:

- User's Stripe customer ID
- Subscription status
- Current plan
- Subscription period dates

Example fields to add to your User model:
```typescript
interface User {
  // ... existing fields
  stripeCustomerId?: string;
  subscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
  subscriptionPlan?: 'free' | 'pro' | 'max';
  subscriptionCurrentPeriodEnd?: Date;
  subscriptionCancelAtPeriodEnd?: boolean;
}
```

## Webhook Event Handlers

The webhook handler (`/api/webhooks/stripe`) currently logs events. You'll need to implement the database updates:

- `checkout.session.completed`: Create/update user's subscription
- `customer.subscription.updated`: Update subscription status
- `customer.subscription.deleted`: Mark subscription as canceled
- `invoice.payment_succeeded`: Extend subscription period
- `invoice.payment_failed`: Handle failed payments

## Going to Production

1. Switch to Live mode in Stripe Dashboard
2. Update all environment variables with production keys
3. Set up production webhook endpoint
4. Update `NEXT_PUBLIC_SITE_URL` to your production URL
5. Test thoroughly with real cards

## Troubleshooting

- **Webhook errors**: Check the Stripe CLI output and webhook logs in Stripe Dashboard
- **Checkout not working**: Verify all environment variables are set correctly
- **Customer portal issues**: Ensure the portal is configured in Stripe Dashboard

## Additional Resources

- [Stripe Docs](https://stripe.com/docs)
- [Next.js Stripe Example](https://github.com/vercel/nextjs-subscription-payments)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)