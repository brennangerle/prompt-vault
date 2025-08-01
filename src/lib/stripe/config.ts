import Stripe from 'stripe';

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY ?? '',
  {
    apiVersion: '2025-07-30.basil',
    appInfo: {
      name: 'Prompt Keeper',
      version: '1.0.0',
    },
  }
);