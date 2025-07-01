'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToAuthState, getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/types';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        // User is authenticated, get their data
        const userData = await getCurrentUser();
        setCurrentUser(userData);
        setIsAuthenticated(true);
      } else {
        // User is not authenticated
        setCurrentUser(null);
        setIsAuthenticated(false);
        router.push('/login');
      }
    });

    return unsubscribe;
  }, [router]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}