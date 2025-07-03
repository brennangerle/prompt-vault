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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 p-6 sm:p-8">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              className="h-12 w-12 rounded-full hover:bg-primary/10 transition-all duration-300 border border-border/30"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
                <BookMarked className="size-7 text-primary animate-glow" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">The Prompt Keeper</span>
            </div>
            <div className="flex items-center gap-3 ml-auto bg-background/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/30">
              <Settings className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Settings</span>
            </div>
          </div>
        </header>

        <main className="p-6 sm:p-8 max-w-4xl mx-auto space-y-8">
          {/* Account Settings */}
          <Card className="border-0 glass-light hover:shadow-xl hover:shadow-primary/10 transition-all-smooth group">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base font-medium">Email</Label>
                <Input 
                  value={currentUser?.email || ''} 
                  disabled 
                  className="bg-background/50 backdrop-blur-sm border-border/50 text-base"
                />
              </div>
              <div className="pt-6 border-t border-border/30">
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-3 px-6 py-3 rounded-full hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all duration-300"
                >
                  <LogOut className="h-5 w-5" />
                  Sign out
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Team Management */}
          <Card className="border-0 glass-light hover:shadow-xl hover:shadow-primary/10 transition-all-smooth group">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors duration-300">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-2xl font-bold group-hover:text-accent transition-colors duration-300">Team Management</CardTitle>
              </div>
              <p className="text-muted-foreground text-base leading-relaxed">
                Manage your team members and their access to shared prompts.
              </p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Add Team Member */}
              {isUserAdminState && currentUser?.teamId && (
                <div className="space-y-4 p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border/30">
                  <Label className="text-lg font-semibold">Add Team Member to {currentUser?.teamId?.toUpperCase()}</Label>
                  <form onSubmit={handleAddMember} className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="flex-1 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-primary/20"
                    />
                    <Button type="submit" className="gap-3 px-6 gradient-primary hover:shadow-lg hover:shadow-primary/30 transition-all duration-300">
                      <UserPlus className="h-5 w-5" />
                      Invite
                    </Button>
                  </form>
                </div>
              )}

              {/* Team Members List */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">
                  Team {currentUser?.teamId?.toUpperCase()} Members ({teamMembers.length})
                </Label>
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 glass-light rounded-xl hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-semibold text-base group-hover:text-primary transition-colors duration-300">{member.email}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="px-3 py-1 font-medium">
                          {member.role}
                        </Badge>
                      </div>
                      {member.role !== 'admin' && 
                       isUserAdminState && 
                       currentUser?.teamId && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-300">
                              <Trash2 className="h-5 w-5" />
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
              <div className="p-6 glass-light rounded-xl border border-primary/20">
                <h4 className="font-semibold text-lg mb-4 text-primary">Team Features</h4>
                <ul className="text-muted-foreground space-y-2 leading-relaxed">
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