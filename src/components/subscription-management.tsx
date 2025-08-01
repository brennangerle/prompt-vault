'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/stripe/helpers';

interface SubscriptionManagementProps {
  subscription?: {
    id: string;
    status: string;
    plan: string;
    price: number;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    stripeCustomerId: string;
  };
}

export function SubscriptionManagement({ subscription }: SubscriptionManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    if (!subscription?.stripeCustomerId) {
      router.push('/pricing');
      return;
    }

    try {
      setLoading(true);

      // Create customer portal session
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: subscription.stripeCustomerId,
        }),
      });

      const { url } = await response.json();

      // Redirect to Stripe Customer Portal
      window.location.href = url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', variant: 'default' as const },
      trialing: { label: 'Trial', variant: 'secondary' as const },
      canceled: { label: 'Canceled', variant: 'destructive' as const },
      past_due: { label: 'Past Due', variant: 'destructive' as const },
      unpaid: { label: 'Unpaid', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      variant: 'outline' as const,
    };

    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            You don't have an active subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Upgrade to a paid plan to unlock premium features
          </p>
          <Button onClick={() => router.push('/pricing')}>
            View Plans
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Manage your subscription and billing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">{subscription.plan} Plan</p>
            <p className="text-sm text-gray-600">
              {formatPrice(subscription.price)}/month
            </p>
          </div>
          {getStatusBadge(subscription.status)}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>
              {subscription.cancelAtPeriodEnd
                ? `Cancels on ${subscription.currentPeriodEnd.toLocaleDateString()}`
                : `Renews on ${subscription.currentPeriodEnd.toLocaleDateString()}`}
            </span>
          </div>

          {subscription.status === 'past_due' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Payment failed. Please update your payment method.</span>
            </div>
          )}
        </div>

        <div className="pt-4">
          <Button
            onClick={handleManageSubscription}
            disabled={loading}
            className="w-full"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Manage Subscription'}
          </Button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Update payment method, change plan, or cancel subscription
          </p>
        </div>
      </CardContent>
    </Card>
  );
}