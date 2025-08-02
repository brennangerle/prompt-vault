'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@/lib/user-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, ArrowLeft } from 'lucide-react';

// Define your subscription plans with Stripe Payment Links
const plans = [
  {
    name: 'Free',
    price: 0,
    paymentLink: null, // No payment needed for free plan
    features: [
      '5 enhanced prompts/month',
      '15 saved prompts',
    ],
  },
  {
    name: 'Base',
    price: 400, // $4.00 in cents
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_BASE_PAYMENT_LINK || 'https://buy.stripe.com/test_base_plan', // Replace with your actual Payment Link
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
    paymentLink: process.env.NEXT_PUBLIC_STRIPE_MAX_PAYMENT_LINK || 'https://buy.stripe.com/test_max_plan', // Replace with your actual Payment Link
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

  const getCurrentSubscription = () => {
    // For now, everyone gets 'Free' - this can be enhanced later with actual subscription logic
    return 'Free';
  };

  const handleGoBack = () => {
    router.push('/settings');
  };

  const handleSubscribe = (paymentLink: string | null, planName: string) => {
    if (!paymentLink) {
      // Free plan - just redirect to dashboard
      router.push('/');
      return;
    }

    if (!currentUser) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    // For no-code Stripe integration, simply redirect to the Payment Link
    // The Payment Link handles all the checkout process
    window.open(paymentLink, '_blank');
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
                onClick={() => !isComingSoon && !isCurrentPlan ? handleSubscribe(plan.paymentLink, plan.name) : undefined}
                disabled={isComingSoon || isCurrentPlan}
              >
                {isCurrentPlan ? 'Current Plan' :
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