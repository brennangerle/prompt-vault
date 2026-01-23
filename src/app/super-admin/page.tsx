'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  ArrowLeft,
  Crown,
  Plus,
  Globe,
  Building2,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  User as UserIcon,
  Activity,
  Clock,
  RefreshCw,
  Search,
  LayoutDashboard,
  ScrollText,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { useToast } from '@/hooks/use-toast';
import {
  getAllTeams,
  createTeam,
  deleteTeam,
  getAllUsers,
  addTeamMember,
  removeTeamMember,
  createPrompt,
  getPromptsBySharing,
  createUser,
  updateUser,
  ensureEmailVerificationEntries,
} from '@/lib/db';
import { useUser } from '@/lib/user-context';
import { canAccessSuperAdmin, isSuperUser } from '@/lib/permissions';
import type { Team, User, TeamMember, Prompt } from '@/lib/types';
import {
  auditTeamCreated,
  auditTeamDeleted,
  auditTeamMemberAdded,
  auditTeamMemberRemoved,
  auditUserCreated,
  getRecentAuditLogs,
  type AuditEntry,
} from '@/lib/audit';

export default function SuperAdminPage() {
  const { currentUser, isLoading } = useUser();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [communityPrompts, setCommunityPrompts] = React.useState<Prompt[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditEntry[]>([]);
  const [activeTab, setActiveTab] = React.useState('dashboard');

  // Form states
  const [newTeamName, setNewTeamName] = React.useState('');
  const [newPromptTitle, setNewPromptTitle] = React.useState('');
  const [newPromptContent, setNewPromptContent] = React.useState('');
  const [newPromptTags, setNewPromptTags] = React.useState('');
  const [promptSharing, setPromptSharing] = React.useState<'private' | 'team' | 'global'>('global');
  const [promptTeamId, setPromptTeamId] = React.useState<string>('');

  // UI states
  const [expandedTeams, setExpandedTeams] = React.useState<Record<string, boolean>>({});
  const [teamInputValues, setTeamInputValues] = React.useState<Record<string, string>>({});
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const router = useRouter();
  const { toast } = useToast();

  // Load initial data
  React.useEffect(() => {
    const initData = async () => {
      try {
        if (!currentUser || isLoading) return;

        if (!canAccessSuperAdmin(currentUser)) {
          router.push('/');
          return;
        }

        await refreshData();
      } catch (error) {
        console.error('Failed to load admin data:', error);
      }
    };

    initData();
  }, [currentUser, isLoading, router]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const [teamsData, usersData, communityData, logsData] = await Promise.all([
        getAllTeams(),
        getAllUsers(),
        getPromptsBySharing('global'),
        getRecentAuditLogs(50),
      ]);

      setTeams(teamsData);
      setUsers(usersData);
      setCommunityPrompts(communityData);
      setAuditLogs(logsData);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Helper functions
  const getUserEmail = (userId: string): string => {
    const user = users.find(u => u.id === userId);
    return user?.email || userId;
  };

  const getTeamName = (teamId: string): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || teamId;
  };

  // Team handlers
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !currentUser) return;

    try {
      const teamId = await createTeam({
        name: newTeamName.trim(),
        createdBy: currentUser.id
      });

      await auditTeamCreated(currentUser.id, currentUser.email, teamId, newTeamName.trim());

      setNewTeamName('');
      await refreshData();
      toast({ title: 'Team created', description: `Team "${newTeamName}" created successfully.` });
    } catch (error) {
      console.error('Failed to create team:', error);
      toast({ title: 'Error', description: 'Failed to create team.', variant: 'destructive' });
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      await deleteTeam(teamId);
      if (currentUser) {
        await auditTeamDeleted(currentUser.id, currentUser.email, teamId, teamName);
      }
      await refreshData();
      toast({ title: 'Team deleted', description: `Team "${teamName}" deleted.` });
    } catch (error) {
      console.error('Failed to delete team:', error);
      toast({ title: 'Error', description: 'Failed to delete team.', variant: 'destructive' });
    }
  };

  const handleAddUserToTeam = async (userEmail: string, teamId: string) => {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        toast({ title: 'Invalid Email', description: 'Please enter a valid email.', variant: 'destructive' });
        return;
      }

      const team = teams.find(t => t.id === teamId);
      if (team?.members.some(m => m.email === userEmail)) {
        toast({ title: 'Already exists', description: 'User is already in this team.', variant: 'destructive' });
        return;
      }

      let user = users.find(u => u.email === userEmail);
      let isNewUser = false;

      if (!user) {
        const userData: Omit<User, 'id'> = { email: userEmail, teamId, role: 'user' };
        const userId = await createUser(userData);
        user = { id: userId, ...userData };
        isNewUser = true;
        if (currentUser) {
          await auditUserCreated(currentUser.id, currentUser.email, userId, userEmail);
        }
      } else {
        await updateUser(user.id, { ...user, teamId });
      }

      const teamMember: TeamMember = {
        id: user.id,
        email: user.email,
        role: 'member',
        joinedAt: new Date().toISOString()
      };

      await addTeamMember(teamId, teamMember);
      if (currentUser) {
        await auditTeamMemberAdded(currentUser.id, currentUser.email, teamId, user.id, userEmail);
      }

      setTeamInputValues(prev => ({ ...prev, [teamId]: '' }));
      await refreshData();
      toast({ title: 'User added', description: `${userEmail} ${isNewUser ? 'created and ' : ''}added to team.` });
    } catch (error) {
      console.error('Failed to add user:', error);
      toast({ title: 'Error', description: 'Failed to add user.', variant: 'destructive' });
    }
  };

  const handleRemoveUserFromTeam = async (userId: string, teamId: string) => {
    try {
      await removeTeamMember(teamId, userId);
      const user = users.find(u => u.id === userId);
      if (user) {
        const { teamId: _, ...userWithoutTeamId } = user;
        await updateUser(userId, userWithoutTeamId);
      }
      if (currentUser) {
        await auditTeamMemberRemoved(currentUser.id, currentUser.email, teamId, userId, user?.email);
      }
      await refreshData();
      toast({ title: 'User removed', description: 'User removed from team.' });
    } catch (error) {
      console.error('Failed to remove user:', error);
      toast({ title: 'Error', description: 'Failed to remove user.', variant: 'destructive' });
    }
  };

  const handleToggleUserRole = async (userId: string, teamId: string, currentRole: 'admin' | 'member') => {
    try {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      const user = users.find(u => u.id === userId);
      if (user) {
        const teamMember: TeamMember = {
          id: userId,
          email: user.email,
          role: newRole,
          joinedAt: new Date().toISOString()
        };
        await addTeamMember(teamId, teamMember);
      }
      await refreshData();
      toast({ title: 'Role updated', description: `User is now ${newRole}.` });
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({ title: 'Error', description: 'Failed to update role.', variant: 'destructive' });
    }
  };

  // Prompt handlers
  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim() || !currentUser) return;
    if (promptSharing === 'team' && !promptTeamId) {
      toast({ title: 'Error', description: 'Please select a team.', variant: 'destructive' });
      return;
    }

    try {
      const promptData: Omit<Prompt, 'id'> = {
        title: newPromptTitle.trim(),
        content: newPromptContent.trim(),
        tags: newPromptTags.split(',').map(tag => tag.trim()).filter(Boolean),
        sharing: promptSharing,
        createdBy: currentUser.id,
        ...(promptSharing === 'team' && promptTeamId ? { teamId: promptTeamId } : {})
      };

      await createPrompt(promptData);
      setNewPromptTitle('');
      setNewPromptContent('');
      setNewPromptTags('');
      setPromptSharing('global');
      setPromptTeamId('');
      await refreshData();
      toast({ title: 'Prompt created', description: 'Prompt created successfully.' });
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast({ title: 'Error', description: 'Failed to create prompt.', variant: 'destructive' });
    }
  };

  const handleFixEmailVerification = async () => {
    try {
      await ensureEmailVerificationEntries();
      toast({ title: 'Success', description: 'Email verification entries updated.' });
    } catch (error) {
      console.error('Failed to fix email verification:', error);
      toast({ title: 'Error', description: 'Failed to update entries.', variant: 'destructive' });
    }
  };

  // Filter functions
  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !isSuperUser(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalMembers = teams.reduce((sum, team) => sum + team.members.length, 0);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border/50 backdrop-blur-md bg-background/80">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/')}
                  className="h-10 w-10 rounded-full hover:bg-primary/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10">
                    <Crown className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold">Admin Panel</h1>
                    <p className="text-sm text-muted-foreground">Manage teams, users, and content</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
              <TabsTrigger value="dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="teams" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Teams</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="prompts" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Prompts</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <ScrollText className="h-4 w-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-blue-500/10">
                        <Building2 className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{teams.length}</p>
                        <p className="text-sm text-muted-foreground">Teams</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-emerald-500/10">
                        <Users className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{users.length}</p>
                        <p className="text-sm text-muted-foreground">Users</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-purple-500/10">
                        <Globe className="h-6 w-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{communityPrompts.length}</p>
                        <p className="text-sm text-muted-foreground">Community Prompts</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-orange-500/10">
                        <UserIcon className="h-6 w-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalMembers}</p>
                        <p className="text-sm text-muted-foreground">Team Members</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {auditLogs.length > 0 ? (
                    <div className="space-y-3">
                      {auditLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{log.action.replace(/_/g, ' ')}</p>
                              <p className="text-xs text-muted-foreground">{log.userEmail || log.userId}</p>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No recent activity</p>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setActiveTab('teams')} variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Team
                    </Button>
                    <Button onClick={() => setActiveTab('prompts')} variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Add Prompt
                    </Button>
                    <Button onClick={handleFixEmailVerification} variant="outline" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Fix Email Verification
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Team Management</CardTitle>
                      <CardDescription>Create and manage teams</CardDescription>
                    </div>
                    <Badge variant="secondary">{teams.length} teams</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Create Team Form */}
                  <form onSubmit={handleCreateTeam} className="flex gap-3">
                    <Input
                      placeholder="New team name"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Team
                    </Button>
                  </form>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search teams..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Teams List */}
                  <div className="space-y-3">
                    {filteredTeams.map((team) => (
                      <Card key={team.id} className="border-border/50">
                        <CardContent className="p-0">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedTeams(prev => ({ ...prev, [team.id]: !prev[team.id] }))}
                                className="h-8 w-8"
                              >
                                {expandedTeams[team.id] ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                              <div>
                                <h3 className="font-semibold">{team.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {team.members.length} members • Created {new Date(team.createdAt || '').toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete team?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{team.name}" and remove all members.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTeam(team.id, team.name)}
                                    className="bg-destructive text-destructive-foreground"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>

                          {expandedTeams[team.id] && (
                            <div className="border-t border-border/50 p-4 space-y-4">
                              {/* Add member */}
                              <div className="flex gap-2">
                                <Input
                                  type="email"
                                  placeholder="Add member by email"
                                  value={teamInputValues[team.id] || ''}
                                  onChange={(e) => setTeamInputValues(prev => ({ ...prev, [team.id]: e.target.value }))}
                                  className="flex-1"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const email = teamInputValues[team.id]?.trim();
                                    if (email) handleAddUserToTeam(email, team.id);
                                  }}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* Members list */}
                              <div className="space-y-2">
                                {team.members.map((member) => (
                                  <div key={member.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <UserIcon className="h-3 w-3 text-primary" />
                                      </div>
                                      <span className="text-sm">{member.email}</span>
                                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                        {member.role}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleUserRole(member.id, team.id, member.role)}
                                        className="h-7 text-xs"
                                      >
                                        {member.role === 'admin' ? 'Demote' : 'Promote'}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveUserFromTeam(member.id, team.id)}
                                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                {team.members.length === 0 && (
                                  <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {filteredTeams.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No teams found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">User Management</CardTitle>
                      <CardDescription>View and manage all users</CardDescription>
                    </div>
                    <Badge variant="secondary">{users.length} users</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Users List */}
                  <div className="divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{user.email}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {user.teamId && <span>Team: {getTeamName(user.teamId)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {user.role === 'super_user' && (
                            <Badge className="bg-amber-500/10 text-amber-600">
                              <Crown className="h-3 w-3 mr-1" />
                              Super Admin
                            </Badge>
                          )}
                          <Badge variant="secondary">{user.role || 'user'}</Badge>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No users found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Prompts Tab */}
            <TabsContent value="prompts" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg">Create Prompt</CardTitle>
                  <CardDescription>Add new prompts to the system</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePrompt} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          placeholder="Prompt title"
                          value={newPromptTitle}
                          onChange={(e) => setNewPromptTitle(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tags (comma-separated)</Label>
                        <Input
                          placeholder="tag1, tag2, tag3"
                          value={newPromptTags}
                          onChange={(e) => setNewPromptTags(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        placeholder="Prompt content..."
                        value={newPromptContent}
                        onChange={(e) => setNewPromptContent(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Sharing</Label>
                        <Select value={promptSharing} onValueChange={(v: 'private' | 'team' | 'global') => setPromptSharing(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="private">Private</SelectItem>
                            <SelectItem value="team">Team</SelectItem>
                            <SelectItem value="global">Community</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {promptSharing === 'team' && (
                        <div className="space-y-2">
                          <Label>Team</Label>
                          <Select value={promptTeamId} onValueChange={setPromptTeamId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team" />
                            </SelectTrigger>
                            <SelectContent>
                              {teams.map(team => (
                                <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <Button type="submit" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Prompt
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Community Prompts List */}
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Community Prompts</CardTitle>
                    <Badge variant="secondary">{communityPrompts.length} prompts</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {communityPrompts.slice(0, 10).map((prompt) => (
                      <div key={prompt.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="font-medium">{prompt.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {prompt.tags.join(', ')} • by {getUserEmail(prompt.createdBy || '')}
                          </p>
                        </div>
                        <Badge variant="outline">Community</Badge>
                      </div>
                    ))}
                    {communityPrompts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No community prompts yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit" className="space-y-6">
              <Card className="border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Audit Log</CardTitle>
                      <CardDescription>Track all administrative actions</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshData} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                            <Activity className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-sm text-muted-foreground">{log.userEmail || log.userId}</p>
                            {log.targetId && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Target: {log.targetType} - {log.targetId}
                              </p>
                            )}
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                          <Clock className="h-3 w-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {auditLogs.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No audit logs yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
