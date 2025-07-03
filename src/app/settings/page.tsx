'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Settings,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useToast } from '@/hooks/use-toast';
import { 
  getTeamMembers as getTeamMembersFromDB, 
  addTeamMember, 
  removeTeamMember,
  isUserAdmin as isUserAdminFromDB,
  subscribeToTeamMembers 
} from '@/lib/db';
import { getCurrentUser, logoutUser } from '@/lib/auth';
import type { TeamMember, User } from '@/lib/types';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isUserAdminState, setIsUserAdminState] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const initUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) return;
        
        setCurrentUser(user);
        
        // Check if user is admin
        if (user.teamId) {
          const isAdmin = await isUserAdminFromDB(user.id, user.teamId);
          setIsUserAdminState(isAdmin);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load user data:', error);
        setIsLoading(false);
      }
    };
    
    initUser();
  }, []);

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
        email: newMemberEmail,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <header className="border-b p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <BookMarked className="size-6 text-primary" />
              <span className="text-lg font-semibold">The Prompt Keeper</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Settings className="h-5 w-5" />
              <span className="font-medium">Settings</span>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={currentUser?.email || ''} disabled />
              </div>
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Team Management</CardTitle>
              </div>
              <p className="text-muted-foreground">
                Manage your team members and their access to shared prompts.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Team Member */}
              {isUserAdminState && currentUser?.teamId && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Add Team Member to {currentUser?.teamId?.toUpperCase()}</Label>
                  <form onSubmit={handleAddMember} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Invite
                    </Button>
                  </form>
                </div>
              )}

              {/* Team Members List */}
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  Team {currentUser?.teamId?.toUpperCase()} Members ({teamMembers.length})
                </Label>
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{member.email}</p>
                          <p className="text-sm text-muted-foreground">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </div>
                      {member.role !== 'admin' && 
                       isUserAdminState && 
                       currentUser?.teamId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove team member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.email} from your team?
                                They will lose access to all shared prompts.
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
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Info */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Team Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Team members can view and edit prompts shared with the team</li>
                  <li>• Only admins can invite or remove team members</li>
                  <li>• Private prompts remain visible only to their creator</li>
                  <li>• Community prompts are visible to everyone</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}