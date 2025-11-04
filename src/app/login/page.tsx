'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookMarked, AlertCircle, RefreshCw, Copy, Eye, EyeOff, CheckCircle2, Circle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/auth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser, createUserWithUid } from '@/lib/db';
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
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = React.useState(false);
  const [createAccountError, setCreateAccountError] = React.useState<string | null>(null);
  const [accountCreated, setAccountCreated] = React.useState(false);
  
  const router = useRouter();

  const PASSWORD_REQUIREMENTS = React.useMemo(() => ([
    {
      id: 'length',
      label: 'At least 12 characters',
      test: (value: string) => value.length >= 12,
    },
    {
      id: 'uppercase',
      label: 'Contains an uppercase letter',
      test: (value: string) => /[A-Z]/.test(value),
    },
    {
      id: 'lowercase',
      label: 'Contains a lowercase letter',
      test: (value: string) => /[a-z]/.test(value),
    },
    {
      id: 'number',
      label: 'Contains a number',
      test: (value: string) => /\d/.test(value),
    },
    {
      id: 'symbol',
      label: 'Contains a symbol',
      test: (value: string) => /[^A-Za-z0-9]/.test(value),
    },
  ]), []);

  const passwordCheckResults = React.useMemo(() => PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    passed: req.test(newPassword),
  })), [PASSWORD_REQUIREMENTS, newPassword]);

  const isPasswordValid = React.useMemo(
    () => passwordCheckResults.every((req) => req.passed),
    [passwordCheckResults]
  );

  const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const length = 16;
    if (typeof window === 'undefined' || !window.crypto?.getRandomValues) {
      return '';
    }

    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    return Array.from(randomValues).reduce((acc, value) => {
      const index = value % charset.length;
      return acc + charset.charAt(index);
    }, '');
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generatePassword();
    if (!generatedPassword) {
      setCreateAccountError('Unable to generate a secure password. Please try again or enter one manually.');
      return;
    }
    setCreateAccountError(null);
    setNewPassword(generatedPassword);
    setConfirmPassword(generatedPassword);
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
    if (!newEmail || !newPassword || !confirmPassword) {
      setCreateAccountError('Please provide email, password, and confirm password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setCreateAccountError('Passwords do not match. Please try again.');
      return;
    }

      if (!isPasswordValid) {
        setCreateAccountError('Please choose a stronger password that meets all requirements.');
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
      
      await createUserWithUid(userCredential.user.uid, userData);
      
      setAccountCreated(true);
      setCreateAccountError(null);
      
      // Clear form
      setNewEmail('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      console.error('Account creation failed:', error.message);
      if (error.code === 'auth/email-already-in-use') {
        setCreateAccountError('An account with this email already exists. Please try logging in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setCreateAccountError('Please enter a valid email address.');
        } else if (error.code === 'auth/weak-password') {
          setCreateAccountError('Password should meet the minimum security requirements.');
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
          <CardTitle className={`font-bold mb-3 transition-colors duration-300 ${
            showCreateAccount 
              ? 'text-3xl text-primary' 
              : 'text-2xl group-hover:text-primary'
          }`}>
            {showCreateAccount ? 'Create New Account' : 'Welcome back'}
          </CardTitle>
          {!showCreateAccount && (
            <p className="text-muted-foreground text-base leading-relaxed">
              Sign in to access your prompt repository
            </p>
          )}
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {!showCreateAccount ? (
            // Login Form
            <>
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
                    variant="outline"
                    onClick={() => setShowCreateAccount(true)}
                    className="w-full h-12 border-primary/20 text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    Create New Account
                  </Button>
                </div>
              </div>
            </>
          ) : (
            // Create Account Form
            <div className="space-y-6">
              
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
                    <div className="space-y-2 rounded-lg border border-border/40 bg-background/40 p-3">
                      <p className="text-xs font-medium text-muted-foreground">Password requirements</p>
                      <ul className="space-y-1.5">
                        {passwordCheckResults.map((req) => (
                          <li key={req.id} className="flex items-center gap-2 text-xs">
                            {req.passed ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground/60" />
                            )}
                            <span className={req.passed ? 'text-emerald-600' : 'text-muted-foreground'}>
                              {req.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base"
                  />
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
                      setConfirmPassword('');
                      setCreateAccountError(null);
                      setAccountCreated(false);
                    }}
                    className="flex-1 h-12"
                  >
                    Back to Login
                  </Button>
                  <Button
                    type="submit"
                      disabled={isCreatingAccount || !newEmail || !newPassword || !confirmPassword || !isPasswordValid}
                    className="flex-1 h-12 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold"
                  >
                    {isCreatingAccount ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </div>
          )}

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