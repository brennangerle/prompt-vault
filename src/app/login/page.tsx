'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookMarked, AlertCircle, RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser } from '@/lib/db';
import type { User } from '@/lib/types';



export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateAccount, setShowCreateAccount] = React.useState(false);
  
  // New account creation state
  const [newEmail, setNewEmail] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = React.useState(false);
  const [createAccountError, setCreateAccountError] = React.useState<string | null>(null);
  const [accountCreated, setAccountCreated] = React.useState(false);
  
  const router = useRouter();

  const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generatePassword();
    setNewPassword(generatedPassword);
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      // You could add a toast notification here if needed
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      setCreateAccountError('Please provide email and password.');
      return;
    }

    if (newPassword.length < 6) {
      setCreateAccountError('Password should be at least 6 characters long.');
      return;
    }

    setIsCreatingAccount(true);
    setCreateAccountError(null);

    try {
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      
      // Create user in database
      const userData: Omit<User, 'id'> = {
        email: newEmail,
        role: 'user'
      };
      
      const userId = await createUser(userData);
      
      setAccountCreated(true);
      setCreateAccountError(null);
      
      // Clear form
      setNewEmail('');
      setNewPassword('');
      
    } catch (error: any) {
      console.error('Account creation failed:', error.message);
      if (error.code === 'auth/email-already-in-use') {
        setCreateAccountError('An account with this email already exists. Please try logging in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setCreateAccountError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setCreateAccountError('Password should be at least 6 characters long.');
      } else {
        setCreateAccountError(error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setIsCreatingAccount(false);
    }
  };

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
            
            {!showCreateAccount && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateAccount(true)}
                  className="w-full h-12 border-primary/20 text-primary hover:bg-primary/10 transition-all duration-300"
                >
                  Create New Account
                </Button>
              </div>
            )}
            
            {showCreateAccount && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Create New Account</h3>
                  <p className="text-sm text-muted-foreground">Generate a secure account with a random password</p>
                </div>
                
                {accountCreated && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <AlertCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription>
                      Account created successfully! You can now use the credentials to log in.
                    </AlertDescription>
                  </Alert>
                )}
                
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="newEmail" className="text-base font-medium">Email Address</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      placeholder="Enter email address"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="newPassword" className="text-base font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Enter your password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="h-8 w-8 p-0 hover:bg-primary/10"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        {newPassword && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleCopyPassword}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeneratePassword}
                      className="w-full h-10 border-primary/20 text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Generate Secure Password
                    </Button>
                  </div>
                  
                  {createAccountError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{createAccountError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateAccount(false);
                        setNewEmail('');
                        setNewPassword('');
                        setCreateAccountError(null);
                        setAccountCreated(false);
                      }}
                      className="flex-1 h-12"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreatingAccount || !newEmail || !newPassword}
                      className="flex-1 h-12 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold"
                    >
                      {isCreatingAccount ? 'Creating Account...' : 'Create Account'}
                    </Button>
                  </div>
                </form>
              </div>
            )}
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