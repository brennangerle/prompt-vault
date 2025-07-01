'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookMarked } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';

interface TesterAccount {
  id: string;
  email: string;
  name: string;
  teamId: string;
}

const testerAccounts: TesterAccount[] = [
  { id: '1', email: 'tester1@t1.com', name: 'Tester 1 (T1)', teamId: 't1' },
  { id: '2', email: 'tester2@t1.com', name: 'Tester 2 (T1)', teamId: 't1' },
  { id: '3', email: 'tester3@t2.com', name: 'Tester 3 (T2)', teamId: 't2' },
  { id: '4', email: 'tester4@t2.com', name: 'Tester 4 (T2)', teamId: 't2' },
];

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await loginUser(email, password);
      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error.message);
      // Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  const handleTesterLogin = async (tester: TesterAccount) => {
    setIsLoading(true);
    
    try {
      await loginUser(tester.email);
      router.push('/');
    } catch (error: any) {
      console.error('Tester login failed:', error.message);
      // Show error message to user
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookMarked className="size-8 text-primary" />
            <span className="text-2xl font-semibold">
              The Prompt Keeper
            </span>
          </div>
          <CardTitle>Welcome back</CardTitle>
          <p className="text-muted-foreground">
            Sign in to access your prompt repository
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          {/* Tester Accounts */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Quick Test Login
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {testerAccounts.map((tester) => (
                <Button
                  key={tester.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTesterLogin(tester)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {tester.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto font-normal">
              Contact your team admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}