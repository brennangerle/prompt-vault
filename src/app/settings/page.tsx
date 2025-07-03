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
  KeyRound,
  Crown,
  Building,
  Plus,
  Shield,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useToast } from '@/hooks/use-toast';
import { 
  getTeamMembers as getTeamMembersFromDB, 
  addTeamMember, 
  removeTeamMember,
  isUserAdmin as isUserAdminFromDB,
  subscribeToTeamMembers,
  getAllTeams,
  createTeam,
  deleteTeam,
  getAllUsers,
  createUser,
  updateUser
} from '@/lib/db';
import { getCurrentUser, logoutUser, sendPasswordReset } from '@/lib/auth';
import { isSuperUser } from '@/lib/permissions';
import type { TeamMember, User, Team } from '@/lib/types';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [newMemberEmail, setNewMemberEmail] = React.useState('');
  const [teamMembers, setTeamMembers] = React.useState<TeamMember[]>([]);
  const [isUserAdminState, setIsUserAdminState] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Super user states
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [allUsers, setAllUsers] = React.useState<User[]>([]);
  const [newTeamName, setNewTeamName] = React.useState('');
  const [selectedTeamId, setSelectedTeamId] = React.useState<string>('');
  const [teamInputValues, setTeamInputValues] = React.useState<Record<string, string>>({});
  const [expandedTeams, setExpandedTeams] = React.useState<Record<string, boolean>>({});
  const [expandedUsersList, setExpandedUsersList] = React.useState(true);
  
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
        
        // Load super user data if applicable
        if (isSuperUser(user)) {
          const [teamsData, usersData] = await Promise.all([
            getAllTeams(),
            getAllUsers()
          ]);
          setTeams(teamsData);
          setAllUsers(usersData);
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

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordReset(email);
      toast({
        title: 'Password reset email sent',
        description: `A password reset email has been sent to ${email}.`,
      });
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      toast({
        title: 'Error',
        description: 'Failed to send password reset email. Please try again.',
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

  // Super User Functions
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !currentUser) return;

    try {
      const teamId = await createTeam({
        name: newTeamName.trim(),
        createdBy: currentUser.id
      });
      
      const newTeam: Team = {
        id: teamId,
        name: newTeamName.trim(),
        members: [],
        createdBy: currentUser.id,
        createdAt: new Date().toISOString()
      };
      
      setTeams([...teams, newTeam]);
      setNewTeamName('');
      toast({
        title: 'Team created',
        description: `Team "${newTeamName}" has been created successfully.`,
      });
    } catch (error) {
      console.error('Failed to create team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      await deleteTeam(teamId);
      setTeams(teams.filter(team => team.id !== teamId));
      toast({
        title: 'Team deleted',
        description: `Team "${teamName}" has been deleted successfully.`,
      });
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete team. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddUserToTeam = async (userEmail: string, teamId: string) => {
    try {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        toast({
          title: 'Invalid Email',
          description: 'Please enter a valid email address.',
          variant: 'destructive'
        });
        return;
      }

      // Check if user exists
      let user = allUsers.find(u => u.email === userEmail);
      let isNewUser = false;
      
      // Check if user is already in this team
      const team = teams.find(t => t.id === teamId);
      if (team?.members.some(m => m.email === userEmail)) {
        toast({
          title: 'User already in team',
          description: `${userEmail} is already a member of this team.`,
          variant: 'destructive'
        });
        return;
      }
      
      if (!user) {
        // Create new user if doesn't exist
        console.log('Creating new user:', userEmail);
        const userData: Omit<User, 'id'> = {
          email: userEmail,
          teamId: teamId,
          role: 'user'
        };
        
        const userId = await createUser(userData);
        user = { id: userId, ...userData };
        isNewUser = true;
        console.log('New user created with ID:', userId);
      } else {
        // Update existing user's teamId
        await updateUser(user.id, { ...user, teamId });
      }

      const teamMember: TeamMember = {
        id: user.id,
        email: user.email,
        role: 'member',
        joinedAt: new Date().toISOString()
      };

      await addTeamMember(teamId, teamMember);
      
      // Clear the specific team's input
      setTeamInputValues(prev => ({ ...prev, [teamId]: '' }));
      
      // Refresh data
      const [updatedTeams, updatedUsers] = await Promise.all([
        getAllTeams(),
        getAllUsers()
      ]);
      setTeams(updatedTeams);
      setAllUsers(updatedUsers);
      
      toast({
        title: 'User added to team',
        description: `${userEmail} has been ${isNewUser ? 'created and ' : ''}added to the team.`,
      });
    } catch (error) {
      console.error('Failed to add user to team:', error);
      toast({
        title: 'Error',
        description: 'Failed to add user to team. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const toggleTeamExpansion = (teamId: string) => {
    setExpandedTeams(prev => ({
      ...prev,
      [teamId]: !prev[teamId]
    }));
  };

  const updateTeamInputValue = (teamId: string, value: string) => {
    setTeamInputValues(prev => ({
      ...prev,
      [teamId]: value
    }));
  };

  const handleToggleUserRole = async (userId: string, teamId: string, currentRole: 'admin' | 'member') => {
    try {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      
      // Update in team members
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        const teamMember: TeamMember = {
          id: userId,
          email: user.email,
          role: newRole,
          joinedAt: new Date().toISOString()
        };
        await addTeamMember(teamId, teamMember);
      }
      
      // Refresh teams data
      const updatedTeams = await getAllTeams();
      setTeams(updatedTeams);
      
      toast({
        title: 'Role updated',
        description: `User role has been changed to ${newRole}.`,
      });
    } catch (error) {
      console.error('Failed to update user role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveUserFromTeam = async (userId: string, teamId: string) => {
    try {
      await removeTeamMember(teamId, userId);
      
      // Update user's teamId to undefined
      const user = allUsers.find(u => u.id === userId);
      if (user) {
        await updateUser(userId, { ...user, teamId: undefined });
      }
      
      // Refresh data
      const [updatedTeams, updatedUsers] = await Promise.all([
        getAllTeams(),
        getAllUsers()
      ]);
      setTeams(updatedTeams);
      setAllUsers(updatedUsers);
      
      toast({
        title: 'User removed from team',
        description: 'User has been removed from the team.',
      });
    } catch (error) {
      console.error('Failed to remove user from team:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user from team. Please try again.',
        variant: 'destructive'
      });
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

        <main className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
          {/* Super User Team Management */}
          {isSuperUser(currentUser) && (
            <Card className="border-0 glass-light hover:shadow-xl hover:shadow-primary/10 transition-all-smooth group">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold flex items-center gap-3 group-hover:text-primary transition-colors duration-300">
                  <div className="p-2 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <Crown className="h-6 w-6 text-primary" />
                  </div>
                  Super Admin - Team Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Create Team */}
                <div className="space-y-4 p-6 bg-background/50 backdrop-blur-sm rounded-xl border border-border/30">
                  <Label className="text-lg font-semibold">Create New Team</Label>
                  <form onSubmit={handleCreateTeam} className="flex gap-3">
                    <Input
                      placeholder="Team name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="flex-1 bg-background/50 backdrop-blur-sm border-border/50"
                    />
                    <Button type="submit" className="gap-3 px-6 gradient-primary">
                      <Plus className="h-5 w-5" />
                      Create Team
                    </Button>
                  </form>
                </div>

                {/* Teams List */}
                <div className="space-y-4">
                  <Label className="text-lg font-semibold">All Teams ({teams.length})</Label>
                  <div className="space-y-4">
                    {teams.map((team) => (
                      <Card key={team.id} className="border-border/30">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTeamExpansion(team.id)}
                                className="p-1 h-8 w-8"
                              >
                                {expandedTeams[team.id] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <Building className="h-6 w-6 text-primary" />
                              <div>
                                <h3 className="font-semibold text-lg">{team.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {team.members.length} members • ID: {team.id}
                                </p>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete team</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete team "{team.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTeam(team.id, team.name)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {/* Team Members - Collapsible */}
                          {expandedTeams[team.id] && (
                            <div className="space-y-3 border-t border-border/30 pt-4">
                              <div className="flex items-center justify-between">
                                <Label className="font-medium">Team Members</Label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="User email"
                                    value={teamInputValues[team.id] || ''}
                                    onChange={(e) => updateTeamInputValue(team.id, e.target.value)}
                                    className="w-48 h-8"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const email = teamInputValues[team.id]?.trim();
                                      if (email) {
                                        handleAddUserToTeam(email, team.id);
                                      }
                                    }}
                                    className="h-8"
                                  >
                                    <UserPlus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {team.members.length > 0 ? (
                                <div className="grid gap-2">
                                  {team.members.map((member) => (
                                    <div key={member.id} className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{member.email}</span>
                                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                          {member.role}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleToggleUserRole(member.id, team.id, member.role)}
                                          className="h-8"
                                        >
                                          <Shield className="h-4 w-4" />
                                          {member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleRemoveUserFromTeam(member.id, team.id)}
                                          className="h-8 hover:bg-destructive/10 hover:text-destructive"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No members in this team</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* All Users */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedUsersList(!expandedUsersList)}
                      className="p-1 h-8 w-8"
                    >
                      {expandedUsersList ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Label className="text-lg font-semibold">All Users ({allUsers.length})</Label>
                  </div>
                  
                  {expandedUsersList && (
                    <div className="grid gap-3">
                      {allUsers.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 bg-background/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <span className="font-medium">{user.email}</span>
                              {user.role === 'super_user' && (
                                <Badge variant="default" className="ml-2">Super User</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {user.teamId && (
                              <Badge variant="outline">
                                Team: {teams.find(t => t.id === user.teamId)?.name || user.teamId}
                              </Badge>
                            )}
                            {!user.teamId && user.role !== 'super_user' && (
                              <Badge variant="secondary">No Team</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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
                      <div className="flex items-center gap-2">
                        {member.role !== 'admin' &&
                         isUserAdminState &&
                         currentUser?.teamId && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleSendPasswordReset(member.email)}
                              className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-300"
                            >
                              <KeyRound className="h-5 w-5" />
                            </Button>
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
                          </>
                        )}
                      </div>
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