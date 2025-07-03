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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <Card className="w-full max-w-lg border-0 glass-light hover:shadow-2xl hover:shadow-primary/20 transition-all-smooth group">
        <CardHeader className="text-center pb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-primary/20 backdrop-blur-sm group-hover:bg-primary/30 transition-colors duration-300">
              <BookMarked className="size-10 text-primary animate-glow" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              The Prompt Keeper
            </span>
          </div>
          <CardTitle className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">Welcome back</CardTitle>
          <p className="text-muted-foreground text-base leading-relaxed">
            Sign in to access your prompt repository
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base"
              />
            </div>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-base font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold text-base"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
          
          {/* Tester Accounts */}
          <div className="mt-8 space-y-5">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-sm uppercase font-medium">
                <span className="bg-card px-4 py-1 text-muted-foreground backdrop-blur-sm rounded-full border border-border/30">
                  Quick Test Login
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {testerAccounts.map((tester) => (
                <Button
                  key={tester.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleTesterLogin(tester)}
                  disabled={isLoading}
                  className="text-sm py-3 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all duration-300"
                >
                  {tester.name}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Button variant="link" className="p-0 h-auto font-medium text-primary hover:text-accent transition-colors duration-300">
              Contact your team admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}