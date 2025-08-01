'use client';

import { useEffect } from 'react';
import Purchases from '@revenuecat/purchases-js';
import { useUser } from './user-context';

const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_PUBLIC_API_KEY;

let purchasesConfigured = false;

export const RevenueCatInitializer = () => {
  const { currentUser, isLoading } = useUser();
  const appUserId = currentUser?.id;

  useEffect(() => {
    if (!apiKey) {
      console.error('RevenueCat API key is not set. Skipping initialization.');
      return;
    }

    if (isLoading) {
      return; // Wait until user state is resolved
    }

    if (appUserId && !purchasesConfigured) {
      console.log('Initializing RevenueCat for user:', appUserId);
      Purchases.configure({
        apiKey: apiKey,
        appUserId: appUserId,
      });
      purchasesConfigured = true;
    } else if (!appUserId && !isLoading) {
        // Handle logout or anonymous users
        if (purchasesConfigured) {
            Purchases.reset();
            purchasesConfigured = false;
            console.log('RevenueCat instance reset.');
        }
    }
  }, [appUserId, isLoading]);

  return null; // This component doesn't render anything
};

// Optional: export a function to get the instance if needed elsewhere
export const getPurchases = () => {
    return Purchases;
}