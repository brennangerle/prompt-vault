'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  BookMarked,
  Users,
  UserPlus,
  Trash2,
  LogOut,
  ArrowLeft,
  KeyRound,
  Crown,
  Building2,
  Mail,
  Shield,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useToast } from '@/hooks/use-toast';
import {
  addTeamMember,
  removeTeamMember,
  isUserAdmin as isUserAdminFromDB,
  subscribeToTeamMembers,
  getTeam
} from '@/lib/db';
import { logoutUser, sendPasswordReset } from '@/lib/auth';
import { useUser } from '@/lib/user-context';
import { isSuperUser } from '@/lib/permissions';
import type { TeamMember, Team } from '@/lib/types';

export default function SettingsPage() {
  const { currentUser, isLoading } = useUser();
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isUserAdminState, setIsUserAdminState] = React.useState(false);
  const [currentTeam, setCurrentTeam] = React.useState<Team | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const initUser = async () => {
      try {
        if (!currentUser || isLoading) return;

        // Check if user is admin of their team
        if (currentUser.teamId) {
          const isAdmin = await isUserAdminFromDB(currentUser.id, currentUser.teamId);
          setIsUserAdminState(isAdmin);

          // Load team info
          const team = await getTeam(currentUser.teamId);
          setCurrentTeam(team);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      }
    };

    initUser();
  }, [currentUser, isLoading]);

  // Subscribe to team members
  React.useEffect(() => {
    if (!currentUser?.teamId) return;

    const unsubscribe = subscribeToTeamMembers(currentUser.teamId, (members) => {
      setTeamMembers(members);
    });

    return unsubscribe;
  }, [currentUser?.teamId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail || !isUserAdminState || !currentUser?.teamId) return;

    try {
      const newMember: TeamMember = {
        id: Date.now().toString(),
        email: newMemberEmail.toLowerCase(),
        role: 'member',
        joinedAt: new Date().toISOString(),
      };

      await addTeamMember(currentUser.teamId, newMember);
      setNewMemberEmail('');
      toast({
        title: 'Team member added',
        description: `${newMemberEmail} has been invited to join your team.`,
      });
    } catch (error) {
      console.error('Failed to add team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add team member. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isUserAdminState || !currentUser?.teamId) return;

    try {
      await removeTeamMember(currentUser.teamId, memberId);
      toast({
        title: 'Team member removed',
        description: 'The team member has been removed successfully.',
      });
    } catch (error) {
      console.error('Failed to remove team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordReset(email);
      toast({
        title: 'Password reset email sent',
        description: `A password reset email has been sent to ${email}.`,
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('Failed to send password reset email:', error);
      toast({
        title: 'Error',
        description: err.message || 'Failed to send password reset email. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border/50 backdrop-blur-md bg-background/80">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/')}
                  className="h-10 w-10 rounded-full hover:bg-primary/10 transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <BookMarked className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage your account and team</p>
                  </div>
                </div>
              </div>

              {isSuperUser(currentUser) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/super-admin')}
                  className="gap-2"
                >
                  <Crown className="h-4 w-4 text-amber-500" />
                  Admin Panel
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
          {/* Account Section */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Account</CardTitle>
                  <CardDescription>Your personal account information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Email Address</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{currentUser?.email || 'Not set'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">{currentUser?.role || 'User'}</span>
                    {isSuperUser(currentUser) && (
                      <Badge variant="default" className="ml-auto bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Crown className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => currentUser?.email && handleSendPasswordReset(currentUser.email)}
                  className="gap-2"
                >
                  <KeyRound className="h-4 w-4" />
                  Reset Password
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Section */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Building2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Team</CardTitle>
                    <CardDescription>
                      {currentTeam ? currentTeam.name : 'You are not part of any team'}
                    </CardDescription>
                  </div>
                </div>
                {isUserAdminState && (
                  <Badge variant="secondary" className="gap-1">
                    <Shield className="h-3 w-3" />
                    Team Admin
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentUser?.teamId && currentTeam ? (
                <>
                  {/* Add Team Member - Only for admins */}
                  {isUserAdminState && (
                    <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                      <Label className="text-sm font-medium mb-3 block">Add Team Member</Label>
                      <form onSubmit={handleAddMember} className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="Enter email address"
                          value={newMemberEmail}
                          onChange={(e) => setNewMemberEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button type="submit" size="sm" className="gap-2">
                          <UserPlus className="h-4 w-4" />
                          Add
                        </Button>
                      </form>
                    </div>
                  )}

                  {/* Team Members List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Team Members</Label>
                      <span className="text-sm text-muted-foreground">{teamMembers.length} members</span>
                    </div>
                    <div className="divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
                      {teamMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-3 bg-card hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{member.email}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                              {member.role}
                            </Badge>
                            {isUserAdminState && member.role !== 'admin' && member.id !== currentUser.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSendPasswordReset(member.email)}
                                  className="h-8 w-8 hover:bg-primary/10"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Remove team member</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to remove {member.email} from your team?
                                        They will lose access to all team prompts.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Remove
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {teamMembers.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No team members yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    You're not part of a team yet. Contact your administrator to be added to a team.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card className="border-border/50 shadow-sm bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">About Sharing</p>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• <strong>Private</strong> prompts are visible only to you</li>
                    <li>• <strong>Team</strong> prompts are shared with all team members</li>
                    <li>• <strong>Community</strong> prompts are visible to everyone</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}
