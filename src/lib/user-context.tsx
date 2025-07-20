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
        try {
          const userData = await getCurrentUser();
          setCurrentUser(userData);
          setIsAuthenticated(true);
        } catch (error: any) {
          console.error('Error getting current user:', error);
          if (error.code === 'PERMISSION_DENIED') {
            console.log('Permission denied - user may not exist in database yet');
          }
          setCurrentUser(null);
          setIsAuthenticated(true); // Still authenticated with Firebase, just no DB record
        }
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