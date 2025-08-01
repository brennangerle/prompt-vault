import { useEffect, useState } from 'react';
import { useUser } from '@/lib/user-context';

export interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
  plan: 'free' | 'pro' | 'max';
  price: number;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
}

export function useSubscription() {
  const { currentUser } = useUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      // TODO: Fetch subscription from your database
      // For now, we'll use mock data
      setSubscription(null);
      setLoading(false);
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [currentUser]);

  const hasActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isPro = hasActiveSubscription && subscription?.plan === 'pro';
  const isMax = hasActiveSubscription && subscription?.plan === 'max';

  return {
    subscription,
    loading,
    hasActiveSubscription,
    isPro,
    isMax,
  };
}