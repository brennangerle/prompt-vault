# Stripe No-Code Integration Setup

This application uses Stripe's no-code Payment Links integration, which eliminates the need for complex backend checkout code and API endpoints.

## Setup Instructions

### 1. Create a Stripe Account
- Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
- Create your Stripe account and complete verification

### 2. Create Products in Stripe Dashboard

#### Create Base Plan Product
1. Go to [Products](https://dashboard.stripe.com/products) in your Stripe Dashboard
2. Click **+ Add product**
3. Fill in the details:
   - **Name**: "The Prompt Keeper - Base Plan"
   - **Description**: "20 enhanced prompts/month, 30 saved prompts, Team management and sharing"
   - **Pricing**: 
     - **Pricing model**: Standard pricing
     - **Price**: $4.00 USD
     - **Billing period**: Monthly
     - **Recurring**: Yes
4. Click **Save product**

#### Create Max Plan Product
1. Click **+ Add product** again
2. Fill in the details:
   - **Name**: "The Prompt Keeper - Max Plan"
   - **Description**: "50 enhanced prompts/month, Unlimited saved prompts, Team management and sharing"
   - **Pricing**: 
     - **Pricing model**: Standard pricing
     - **Price**: $10.00 USD
     - **Billing period**: Monthly
     - **Recurring**: Yes
3. Click **Save product**

### 3. Create Payment Links

#### Create Base Plan Payment Link
1. Go to [Payment Links](https://dashboard.stripe.com/payment-links) in your Stripe Dashboard
2. Click **+ New**
3. Select your "Base Plan" product
4. Configure options:
   - **Allow quantity adjustment**: Off
   - **Collect customer information**: 
     - Email address: Required
     - Name: Optional
   - **Payment methods**: Enable card payments and any local methods you want
5. Click **Create link**
6. Copy the generated Payment Link URL (e.g., `https://buy.stripe.com/your-base-link`)

#### Create Max Plan Payment Link
1. Click **+ New** again
2. Select your "Max Plan" product
3. Configure the same options as Base Plan
4. Click **Create link**
5. Copy the generated Payment Link URL (e.g., `https://buy.stripe.com/your-max-link`)

### 4. Configure Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Stripe Payment Links (replace with your actual links)
NEXT_PUBLIC_STRIPE_BASE_PAYMENT_LINK=https://buy.stripe.com/your-base-link
NEXT_PUBLIC_STRIPE_MAX_PAYMENT_LINK=https://buy.stripe.com/your-max-link
```

### 5. Customize Branding (Optional)

1. Go to [Branding](https://dashboard.stripe.com/settings/branding) in your Stripe Dashboard
2. Upload your logo and set your brand colors
3. This will apply to all Payment Link checkout pages

### 6. Set Up Customer Portal (Optional)

1. Go to [Customer Portal](https://dashboard.stripe.com/settings/billing/portal)
2. Click **Activate link**
3. Configure portal settings:
   - **Business information**: Add your business details
   - **Customer information**: Choose what customers can edit
   - **Subscription and billing**: Allow subscription management
   - **Payment methods**: Allow customers to update payment methods

## Benefits of No-Code Integration

### ✅ Advantages
- **No backend required**: No need to create API endpoints for checkout
- **PCI compliance**: Stripe handles all payment processing
- **Built-in features**: 
  - Automatic tax calculation
  - Multiple payment methods
  - Mobile-optimized checkout
  - Subscription management
  - Customer portal
  - Invoice generation
  - Failed payment recovery
- **Easy maintenance**: Updates handled by Stripe
- **Quick setup**: Ready in minutes vs. hours of development

### ⚠️ Considerations
- **Less customization**: Limited control over checkout flow
- **External redirect**: Users leave your site for checkout
- **Webhook setup needed**: For subscription status updates (can be added later)

## Next Steps (Optional Enhancements)

### 1. Add Webhooks for Status Updates
- Set up webhook endpoints to track subscription status changes
- Update user subscription status in your database

### 2. Implement Customer Portal Integration
- Add customer portal links to your settings page
- Allow users to manage their subscriptions directly

### 3. Add Analytics Tracking
- Use UTM parameters in Payment Links for better analytics
- Track conversion rates and customer behavior

## Testing

### Test Mode
- Use Stripe test mode during development
- Test with [Stripe test card numbers](https://stripe.com/docs/testing#cards)
- Common test card: `4242 4242 4242 4242`

### Go Live
1. Switch to live mode in Stripe Dashboard
2. Update Payment Links with live versions
3. Update environment variables with live Payment Links
4. Complete account verification for live payments

## Support Resources

- [Stripe Payment Links Documentation](https://docs.stripe.com/payment-links)
- [Stripe No-Code Guide](https://docs.stripe.com/no-code)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Support](https://support.stripe.com)