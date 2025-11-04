'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookMarked, CheckCircle, XCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { verifyEmailExists, getTeam } from '@/lib/db';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { User, Team } from '@/lib/types';

export default function FirstTimeLoginPage() {
  const [step, setStep] = React.useState<'email' | 'password'>('email');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [user, setUser] = React.useState<User | null>(null);
  const [team, setTeam] = React.useState<Team | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Checking email:', email);
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: 'Invalid Email',
          description: 'Please enter a valid email address.',
          variant: 'destructive'
        });
        return;
      }

      // Check if user exists in database using email verification
      console.log('Calling verifyEmailExists...');
      const emailVerification = await verifyEmailExists(email);
      console.log('Email verification result:', emailVerification);
      
      if (emailVerification.exists && emailVerification.userId) {
        // Create user object from verification data
        const foundUser: User = {
          id: emailVerification.userId,
          email: emailVerification.email!,
          teamId: emailVerification.teamId,
          role: 'user'
        };
        
        console.log('User found:', foundUser);
        setUser(foundUser);
        
        // Load team data if user has a teamId
        if (foundUser.teamId) {
          try {
            const teamData = await getTeam(foundUser.teamId);
            setTeam(teamData);
          } catch (error) {
            console.error('Error loading team data:', error);
          }
        }
        
        setStep('password');
        toast({
          title: 'User Found!',
          description: `Welcome ${foundUser.email}! Please set up your password.`,
        });
      } else {
        console.log('User not found in email verification');
        toast({
          title: 'User Not Found',
          description: 'This email is not in our system. Please contact your team admin to be added first.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to check user:', error);
      toast({
        title: 'Error',
        description: 'Failed to check user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Password validation
      if (password.length < 6) {
        toast({
          title: 'Password Too Short',
          description: 'Password must be at least 6 characters long.',
          variant: 'destructive'
        });
        return;
      }

      if (password !== confirmPassword) {
        toast({
          title: 'Passwords Do Not Match',
          description: 'Please make sure both passwords are the same.',
          variant: 'destructive'
        });
        return;
      }

      // Create Firebase Auth user
      await createUserWithEmailAndPassword(auth, email, password);
      
      toast({
        title: 'Account Created Successfully!',
        description: 'You can now log in with your new password.',
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      console.error('Failed to create account:', error);
      
      let errorMessage = 'Failed to create account. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists. Try logging in normally instead.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { text: 'At least 6 characters', met: password.length >= 6 },
    { text: 'Passwords match', met: password === confirmPassword && password.length > 0 },
  ];

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
            {step === 'email' ? 'First Time Login' : 'Set Up Your Password'}
          </CardTitle>
          <p className="text-muted-foreground text-base leading-relaxed">
            {step === 'email' 
              ? 'Enter your email to verify you\'re in our system' 
              : 'Create a secure password for your account'
            }
          </p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/login')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleEmailCheck} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  This email should have been added to a team by your admin.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full h-12 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Checking...' : 'Check Email'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordSetup} className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div className="flex items-center gap-2 text-accent">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Email Verified</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{email}</p>
                  {user?.teamId && (
                    <p className="text-sm text-muted-foreground">Team: {team?.name || 'Loading team info...'}</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-base font-medium">New Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20 text-base pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password Requirements</Label>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <CheckCircle className="h-4 w-4 text-accent" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={req.met ? 'text-accent' : 'text-muted-foreground'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 font-semibold text-base"
                disabled={isLoading || !passwordRequirements.every(req => req.met)}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}