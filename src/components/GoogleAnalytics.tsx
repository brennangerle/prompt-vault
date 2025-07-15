'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/firebase';
import { logEvent } from 'firebase/analytics';

export function GoogleAnalytics() {
  const pathname = usePathname();

  // Track page views when route changes
  useEffect(() => {
    if (analytics) {
      logEvent(analytics, 'page_view', {
        page_path: pathname,
        page_title: document.title,
      });
    }
  }, [pathname]);

  return null; // This component doesn't render anything
}

// Helper function to track custom events
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (analytics) {
    logEvent(analytics, eventName, parameters);
  }
}

// Helper function to track user interactions
export function trackUserInteraction(action: string, category: string, label?: string) {
  if (analytics) {
    logEvent(analytics, 'user_interaction', {
      action,
      category,
      label,
    });
  }
}