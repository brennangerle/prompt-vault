'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStripe } from '@/lib/stripe/client';
import { useUser } from '@/lib/user-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft } from 'lucide-react';

// Define your subscription plans
const plans = [
  {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '5 enhanced prompts/month',
      '15 saved prompts',
    ],
  },
  {
    name: 'Base',
    price: 400, // $4.00 in cents
    priceId: process.env.NEXT_PUBLIC_STRIPE_BASE_PRICE_ID || 'price_base_placeholder',
    features: [
      '20 enhanced prompts/month',
      '30 saved prompts',
      'Team management and sharing',
    ],
    popular: true,
  },
  {
    name: 'Max',
    price: 1000, // $10.00 in cents
    priceId: process.env.NEXT_PUBLIC_STRIPE_MAX_PRICE_ID || 'price_max_placeholder',
    features: [
      '50 enhanced prompts/month',
      'Unlimited saved prompts',
      'Team management and sharing',
    ],
    comingSoon: true,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState<string | null>(null);

  const getCurrentSubscription = () => {
    // For now, everyone gets 'Free' - this can be enhanced later with actual subscription logic
    return 'Free';
  };

  const handleGoBack = () => {
    router.push('/settings');
  };

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
      {/* Back Button */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleGoBack}
          className="gap-2 hover:bg-primary/10 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Button>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600">
          Select the perfect plan for your needs. Upgrade or downgrade at any time.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const currentSubscription = getCurrentSubscription();
          const isCurrentPlan = plan.name === currentSubscription;
          const isComingSoon = plan.comingSoon;
          
          return (
            <Card
              key={plan.name}
              className={`relative bg-white border-gray-200 ${
                plan.popular ? 'border-2 border-purple-500 shadow-lg' : 'border border-gray-200'
              } ${isComingSoon ? 'opacity-60' : ''} rounded-2xl`}
            >
              {plan.popular && !isCurrentPlan && !isComingSoon && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Current
                  </Badge>
                </div>
              )}

              {isComingSoon && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge variant="secondary" className="px-3 py-1 rounded-full text-sm font-semibold">
                    Coming Soon
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-3xl font-bold mb-4">{plan.name}</CardTitle>
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <span className="text-4xl font-bold text-purple-600">$0</span>
                  ) : plan.name === 'Base' ? (
                    <span className="text-4xl font-bold text-blue-600">${plan.price / 100}</span>
                  ) : (
                    <span className="text-4xl font-bold text-blue-600">${plan.price / 100}</span>
                  )}
                  <span className="text-gray-600 ml-1">/month</span>
                </div>
              </CardHeader>

            <CardContent className="pt-0">
              <ul className="space-y-4">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-base">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="pt-6">
              <Button
                className="w-full py-3 text-base font-semibold"
                variant={isCurrentPlan ? 'secondary' : plan.popular ? 'default' : 'outline'}
                onClick={() => !isComingSoon && !isCurrentPlan ? handleSubscribe(plan.priceId, plan.name) : undefined}
                disabled={loading === plan.name || isComingSoon || isCurrentPlan}
              >
                {loading === plan.name ? 'Processing...' : 
                 isCurrentPlan ? 'Current Plan' :
                 isComingSoon ? 'Coming Soon' :
                 plan.price === 0 ? 'Get Started' : 'Subscribe'}
              </Button>
            </CardFooter>
          </Card>
          );
        })}
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