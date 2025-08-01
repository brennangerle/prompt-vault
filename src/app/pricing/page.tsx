'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStripe } from '@/lib/stripe/client';
import { useUser } from '@/lib/user-context';
import { formatPrice } from '@/lib/stripe/helpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

// Define your subscription plans
const plans = [
  {
    name: 'Free',
    price: 0,
    priceId: null,
    description: 'Get started with basic features',
    features: [
      'Up to 10 prompts',
      'Basic organization',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: 400, // $4.00 in cents
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || 'price_pro_placeholder',
    description: 'Perfect for professionals',
    features: [
      'Unlimited prompts',
      'Advanced organization',
      'Priority support',
      'Export functionality',
      'Team collaboration',
    ],
    popular: true,
  },
  {
    name: 'Max',
    price: 1000, // $10.00 in cents
    priceId: process.env.NEXT_PUBLIC_STRIPE_MAX_PRICE_ID || 'price_max_placeholder',
    description: 'For power users and teams',
    features: [
      'Everything in Pro',
      'API access',
      'Custom integrations',
      'Advanced analytics',
      'Dedicated support',
      'Custom branding',
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null, planName: string) => {
    if (!priceId) {
      // Free plan - just redirect to dashboard
      router.push('/');
      return;
    }

    if (!currentUser) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    try {
      setLoading(planName);

      // Create checkout session
      const response = await fetch('/api/stripe/checkout-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          userId: currentUser.id,
          userEmail: currentUser.email,
        }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await getStripe();
      const { error } = await stripe!.redirectToCheckout({ sessionId });

      if (error) {
        console.error('Stripe checkout error:', error);
        // TODO: Show error toast
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      // TODO: Show error toast
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600">
          Select the perfect plan for your needs. Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${
              plan.popular ? 'border-primary shadow-lg scale-105' : ''
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">
                  {plan.price === 0 ? 'Free' : formatPrice(plan.price)}
                </span>
                {plan.price > 0 && (
                  <span className="text-gray-600 ml-2">/month</span>
                )}
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan.priceId, plan.name)}
                disabled={loading === plan.name}
              >
                {loading === plan.name ? 'Processing...' : 
                 plan.price === 0 ? 'Get Started' : 'Subscribe'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center text-sm text-gray-600">
        <p>All plans include a 14-day free trial. Cancel anytime.</p>
        <p className="mt-2">
          Prices are in USD. Taxes may apply based on your location.
        </p>
      </div>
    </div>
  );
}