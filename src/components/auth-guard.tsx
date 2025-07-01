'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const publicPaths = ['/login', '/register', '/auth'];

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
      
      if (requireAuth && !user && !isPublicPath) {
        // User is not authenticated and trying to access protected route
        router.push('/login');
      } else if (!requireAuth && user && isPublicPath) {
        // User is authenticated and trying to access auth pages
        router.push('/');
      }
    }
  }, [user, loading, router, pathname, requireAuth]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // Don't render protected content if user is not authenticated
  if (requireAuth && !user) {
    return null;
  }

  return <>{children}</>;
}