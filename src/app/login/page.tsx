'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookMarked, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';



export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      await loginUser(email, password);
      router.push('/');
    } catch (error: any) {
      console.error('Login failed:', error.message);
      setError(error.message || 'Login failed. Please try again.');
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
          <CardTitle className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
            Welcome back
          </CardTitle>
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
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button
              type="submit"
              className="w-full h-12 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold text-base"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8">
            <Separator className="mb-6" />
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/signup')}
                className="w-full h-12 border-primary/20 text-primary hover:bg-primary/10 transition-all duration-300"
              >
                Create New Account
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <div>
              Need help with your account?{' '}
              <a 
                href="https://www.thepromptkeeper.com/#contact" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-medium text-primary hover:text-accent transition-colors duration-300 underline decoration-dotted underline-offset-4"
              >
                Contact the Master Keeper
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}