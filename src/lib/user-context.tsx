'use client';

import * as React from 'react';
import { subscribeToAuthState, getCurrentUser } from '@/lib/auth';
import type { User } from '@/lib/types';

interface UserContextType {
  currentUser: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const UserContext = React.createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

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
      }
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ currentUser, isLoading, isAuthenticated }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}