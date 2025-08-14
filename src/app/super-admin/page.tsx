'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  ArrowLeft,
  Crown,
  Plus,
  Globe,
  Building,
  FileText,
  ChevronDown,
  ChevronRight,
  Shield,
  User as UserIcon,
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
  listEmailVerificationEntries
} from '@/lib/db';
import { useUser } from '@/lib/user-context';
import { canAccessSuperAdmin, isSuperUser } from '@/lib/permissions';
import type { Team, User, TeamMember, Prompt } from '@/lib/types';

export default function SuperAdminPage() {
  const { currentUser, isLoading } = useUser();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [communityPrompts, setCommunityPrompts] = React.useState<Prompt[]>([]);
  const [newTeamName, setNewTeamName] = React.useState('');
  const [newPromptTitle, setNewPromptTitle] = React.useState('');
  const [newPromptContent, setNewPromptContent] = React.useState('');
  const [newPromptTags, setNewPromptTags] = React.useState('');
  const [selectedTeamForPrompt, setSelectedTeamForPrompt] = React.useState<string>('');
  const [promptSharing, setPromptSharing] = React.useState<'team' | 'global'>('global');
  const [expandedTeams, setExpandedTeams] = React.useState<Record<string, boolean>>({});
  const [teamInputValues, setTeamInputValues] = React.useState<Record<string, string>>({});
  const [isFixingEmailVerification, setIsFixingEmailVerification] = React.useState(false);
  const [bulkPromptText, setBulkPromptText] = React.useState('');
  const [bulkPromptSharing, setBulkPromptSharing] = React.useState<'team' | 'global'>('global');
  const [selectedTeamForBulkPrompts, setSelectedTeamForBulkPrompts] = React.useState<string>('');
  const [isProcessingBulkPrompts, setIsProcessingBulkPrompts] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Helper function to get user name from ID
  const getUserName = (userId: string): string => {
    if (!userId) return 'Unknown User';
    const user = users.find(u => u.id === userId);
    return user?.email || `User ID: ${userId}`;
  };

  // Helper function to get team name from ID
  const getTeamName = (teamId: string): string => {
    if (!teamId) return 'Unknown Team';
    const team = teams.find(t => t.id === teamId);
    return team?.name || `Team ID: ${teamId}`;
  };

  React.useEffect(() => {
    const initData = async () => {
      try {
        if (!currentUser || isLoading) return;
        
        if (!canAccessSuperAdmin(currentUser)) {
          router.push('/');
          return;
        }
        
        // Load all data
        const [teamsData, usersData, communityData] = await Promise.all([
          getAllTeams(),
          getAllUsers(),
          getPromptsBySharing('global')
        ]);
        
        setTeams(teamsData);
        setUsers(usersData);
        setCommunityPrompts(communityData);
      } catch (error) {
        console.error('Failed to load super admin data:', error);
      }
    };
    
    initData();
  }, [currentUser, isLoading, router]);

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

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim() || !currentUser) return;

    try {
      const promptData: Omit<Prompt, 'id'> = {
        title: newPromptTitle.trim(),
        content: newPromptContent.trim(),
        tags: newPromptTags.split(',').map(tag => tag.trim()).filter(Boolean),
        sharing: promptSharing,
        createdBy: currentUser.id,
        ...(promptSharing === 'team' && selectedTeamForPrompt && { teamId: selectedTeamForPrompt })
      };
      
      await createPrompt(promptData);
      
      // Refresh community prompts if global
      if (promptSharing === 'global') {
        const updatedCommunityPrompts = await getPromptsBySharing('global');
        setCommunityPrompts(updatedCommunityPrompts);
      }
      
      // Reset form
      setNewPromptTitle('');
      setNewPromptContent('');
      setNewPromptTags('');
      setSelectedTeamForPrompt('');
      setPromptSharing('global');
      
      toast({
        title: 'Prompt created',
        description: `Prompt "${newPromptTitle}" has been created successfully.`,
      });
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast({
        title: 'Error',
        description: 'Failed to create prompt. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const parseBulkPrompts = (text: string): Array<{ title: string; content: string; tags: string[] }> => {
    const prompts: Array<{ title: string; content: string; tags: string[] }> = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentPrompt: { title: string; content: string; tags: string[] } | null = null;
    let isInContent = false;
    
    for (const line of lines) {
      // Check if this line is a title (starts with "Title:" or just a standalone title)
      if (line.toLowerCase().startsWith('title:')) {
        if (currentPrompt) {
          prompts.push(currentPrompt);
        }
        currentPrompt = {
          title: line.substring(6).trim(),
          content: '',
          tags: []
        };
        isInContent = false;
      } else if (line.toLowerCase().startsWith('content:')) {
        if (currentPrompt) {
          currentPrompt.content = line.substring(8).trim();
          isInContent = true;
        }
      } else if (line.toLowerCase().startsWith('tags:')) {
        if (currentPrompt) {
          currentPrompt.tags = line.substring(5).trim().split(',').map(tag => tag.trim()).filter(Boolean);
        }
      } else if (line.startsWith('---') || line.startsWith('===')) {
        // Separator line - finish current prompt and start new one
        if (currentPrompt) {
          prompts.push(currentPrompt);
          currentPrompt = null;
          isInContent = false;
        }
      } else {
        // This is either a title line or content continuation
        if (!currentPrompt) {
          // Start new prompt with this line as title
          currentPrompt = {
            title: line,
            content: '',
            tags: []
          };
          isInContent = false;
        } else if (isInContent) {
          // Continue content
          currentPrompt.content += (currentPrompt.content ? '\n' : '') + line;
        } else {
          // If we have a title but no content marker, treat next non-empty line as content
          if (currentPrompt.title && !currentPrompt.content) {
            currentPrompt.content = line;
            isInContent = true;
          }
        }
      }
    }
    
    // Add the last prompt if exists
    if (currentPrompt) {
      prompts.push(currentPrompt);
    }
    
    return prompts.filter(p => p.title && p.content);
  };

  const handleBulkCreatePrompts = async () => {
    if (!bulkPromptText.trim() || !currentUser) return;
    
    setIsProcessingBulkPrompts(true);
    
    try {
      const parsedPrompts = parseBulkPrompts(bulkPromptText);
      
      if (parsedPrompts.length === 0) {
        toast({
          title: 'No prompts found',
          description: 'Please check your format. Each prompt should have a title and content.',
          variant: 'destructive'
        });
        setIsProcessingBulkPrompts(false);
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const promptData of parsedPrompts) {
        try {
          const prompt: Omit<Prompt, 'id'> = {
            title: promptData.title,
            content: promptData.content,
            tags: promptData.tags,
            sharing: bulkPromptSharing,
            createdBy: currentUser.id,
            ...(bulkPromptSharing === 'team' && selectedTeamForBulkPrompts && { teamId: selectedTeamForBulkPrompts })
          };
          
          await createPrompt(prompt);
          successCount++;
        } catch (error) {
          console.error(`Failed to create prompt "${promptData.title}":`, error);
          errorCount++;
        }
      }
      
      // Refresh community prompts if global
      if (bulkPromptSharing === 'global') {
        const updatedCommunityPrompts = await getPromptsBySharing('global');
        setCommunityPrompts(updatedCommunityPrompts);
      }
      
      // Reset form
      setBulkPromptText('');
      setSelectedTeamForBulkPrompts('');
      setBulkPromptSharing('global');
      
      toast({
        title: 'Bulk prompts processed',
        description: `Successfully created ${successCount} prompts${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
        variant: errorCount > 0 ? 'destructive' : 'default'
      });
      
    } catch (error) {
      console.error('Failed to process bulk prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to process bulk prompts. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessingBulkPrompts(false);
    }
  };

  const demoPrompts = [
    {
      title: "Code Review Assistant",
      content: `You are an experienced software engineer conducting a thorough code review. Please analyze the following code and provide:

1. **Potential Bugs**: Identify any logical errors, edge cases, or potential runtime issues
2. **Performance Issues**: Highlight inefficient algorithms, memory leaks, or optimization opportunities  
3. **Code Quality**: Comment on readability, maintainability, and adherence to best practices
4. **Security Concerns**: Point out any security vulnerabilities or unsafe practices
5. **Suggestions**: Provide specific, actionable recommendations for improvement

Please be constructive and educational in your feedback, explaining the reasoning behind each suggestion.

[Paste your code here]`,
      tags: ["Code", "Development", "Review"]
    },
    {
      title: "Meeting Summary Generator",
      content: `Transform these meeting notes into a professional, structured summary. Please organize the information into:

**Meeting Overview:**
- Date, attendees, and purpose

**Key Discussion Points:**
- Main topics covered with brief summaries

**Decisions Made:**
- Clear list of what was decided

**Action Items:**
- Who is responsible for what, with deadlines if mentioned

**Next Steps:**
- Follow-up meetings or milestones

Keep the tone professional and focus on actionable outcomes.

[Paste your meeting notes here]`,
      tags: ["Business", "Productivity", "Meetings"]
    },
    {
      title: "Email Professional Tone Converter",
      content: `Please rewrite the following message to have a professional, courteous tone suitable for workplace communication. Maintain the core message while:

- Using appropriate business language
- Ensuring respectful and clear communication
- Adding proper greetings and closings if missing
- Removing any casual or potentially inappropriate language
- Keeping the message concise but complete

Original message:
[Paste your casual message here]`,
      tags: ["Business", "Communication", "Writing"]
    },
    {
      title: "Creative Writing Starter",
      content: `Help me develop a creative story concept. Based on the genre and elements I provide, please generate:

**Character Profiles:**
- Main protagonist with personality, background, and motivation
- Key supporting characters with their roles and relationships

**Setting Details:**
- Time period and location with atmospheric description
- Important locations where the story unfolds

**Plot Framework:**
- Inciting incident that starts the story
- Central conflict or challenge
- Potential plot twists or complications
- Satisfying resolution direction

**Themes to Explore:**
- Underlying messages or questions the story could address

Genre/Elements I want to include:
[Describe your preferred genre, themes, or specific elements]`,
      tags: ["Creative", "Writing", "Storytelling"]
    },
    {
      title: "Technical Documentation Writer",
      content: `Create clear, comprehensive technical documentation for the feature/system described below. Structure the documentation with:

**Overview:**
- Purpose and scope of the feature/system
- Target audience and prerequisites

**Technical Specifications:**
- Architecture and components
- Key technical details and requirements

**Implementation Guide:**
- Step-by-step setup or integration instructions
- Code examples with explanations
- Configuration options and parameters

**Usage Examples:**
- Common use cases with practical examples
- Best practices and recommendations

**Troubleshooting:**
- Common issues and solutions
- Error messages and their meanings

**Additional Resources:**
- Related documentation or helpful links

Subject to document:
[Describe the feature, API, system, or process you need documented]`,
      tags: ["Documentation", "Technical", "Development"]
    },
    {
      title: "Data Analysis Interpreter", 
      content: `Analyze the data/metrics provided and create an insightful interpretation that includes:

**Data Summary:**
- Key statistics and notable figures
- Data quality and completeness assessment

**Trend Analysis:**
- Patterns, trends, and anomalies observed
- Comparison with previous periods if applicable

**Key Insights:**
- What the data reveals about performance/behavior
- Significant correlations or relationships

**Business Implications:**
- What these findings mean for decision-making
- Potential opportunities or concerns highlighted

**Recommendations:**
- Actionable next steps based on the analysis
- Areas requiring further investigation

**Visualization Suggestions:**
- Best chart types to represent key findings
- Important metrics to track going forward

Data to analyze:
[Paste your data, metrics, or describe the dataset]`,
      tags: ["Analytics", "Business", "Data"]
    },
    {
      title: "Social Media Content Creator",
      content: `Create engaging social media content based on the topic/message provided. Generate:

**Platform-Specific Posts:**
- LinkedIn: Professional, informative tone
- Twitter/X: Concise, engaging with relevant hashtags
- Instagram: Visual-focused with compelling captions
- Facebook: Community-friendly and conversational

**Content Elements:**
- Hook to grab attention in the first line
- Clear value proposition or key message
- Call-to-action that encourages engagement
- Relevant hashtags for discoverability
- Emoji usage where appropriate

**Engagement Strategies:**
- Questions to spark discussion
- Shareable insights or tips
- Trending topics or current events tie into

**Content Calendar Ideas:**
- Series of related posts to maintain momentum
- Optimal posting times and frequency suggestions

Topic/Message to promote:
[Describe your product, service, announcement, or message]`,
      tags: ["Marketing", "Social Media", "Content"]
    },
    {
      title: "Problem-Solving Framework",
      content: `Guide me through a structured problem-solving approach for the challenge described below. Use this framework:

**1. Problem Definition:**
- Clearly articulate the core problem
- Distinguish symptoms from root causes
- Define success criteria and constraints

**2. Information Gathering:**
- Key questions to ask and data to collect
- Stakeholders to consult
- Assumptions to validate

**3. Root Cause Analysis:**
- Potential underlying causes
- Methods to investigate each cause
- Evidence needed to confirm/eliminate causes

**4. Solution Generation:**
- Multiple potential approaches
- Pros and cons of each option
- Resource requirements and feasibility

**5. Decision Making:**
- Evaluation criteria for solutions
- Risk assessment for top options
- Recommended approach with rationale

**6. Implementation Planning:**
- Key steps and timeline
- Success metrics and checkpoints
- Contingency plans for obstacles

Problem to solve:
[Describe your challenge, decision, or complex situation]`,
      tags: ["Strategy", "Problem-Solving", "Business"]
    }
  ];

  const handleCreateDemoPrompts = async () => {
    if (!currentUser) return;

    try {
      let successCount = 0;

      for (const demoPrompt of demoPrompts) {
        const promptData: Omit<Prompt, 'id'> = {
          title: demoPrompt.title,
          content: demoPrompt.content,
          tags: demoPrompt.tags,
          sharing: 'global',
          createdBy: currentUser.id
        };
        
        await createPrompt(promptData);
        successCount++;
      }

      // Refresh community prompts
      const updatedCommunityPrompts = await getPromptsBySharing('global');
      setCommunityPrompts(updatedCommunityPrompts);

      toast({
        title: 'Demo prompts created!',
        description: `Successfully created ${successCount} demo prompts for the community.`,
      });
    } catch (error) {
      console.error('Failed to create demo prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to create demo prompts. Please try again.',
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

  const handleAddUserToTeam = async (userEmail: string, teamId: string) => {
    try {
      console.log('Adding user to team:', { userEmail, teamId });
      
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
      let user = users.find(u => u.email === userEmail);
      let isNewUser = false;
      console.log('Existing user found:', user ? 'Yes' : 'No');
      
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
        const userData: Omit<User, 'id'> = {
          email: userEmail,
          teamId: teamId,
          role: 'user'
        };
        
        console.log('Creating new user:', userData);
        const userId = await createUser(userData);
        user = { id: userId, ...userData };
        isNewUser = true;
        console.log('New user created with ID:', userId);
      } else {
        // Update existing user's teamId
        console.log('Updating existing user teamId');
        await updateUser(user.id, { ...user, teamId });
      }

      const teamMember: TeamMember = {
        id: user.id,
        email: user.email,
        role: 'member',
        joinedAt: new Date().toISOString()
      };

      console.log('Adding team member:', teamMember);
      await addTeamMember(teamId, teamMember);
      
      // Clear the specific team's input
      setTeamInputValues(prev => ({ ...prev, [teamId]: '' }));
      
      // Refresh data
      const [updatedTeams, updatedUsers] = await Promise.all([
        getAllTeams(),
        getAllUsers()
      ]);
      setTeams(updatedTeams);
      setUsers(updatedUsers);
      
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

  const handleToggleUserRole = async (userId: string, teamId: string, currentRole: 'admin' | 'member') => {
    try {
      const newRole = currentRole === 'admin' ? 'member' : 'admin';
      
      // Update in team members
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
      
      // Update user to remove teamId property
      const user = users.find(u => u.id === userId);
      if (user) {
        // Create a new user object without the teamId property
        const { teamId: _, ...userWithoutTeamId } = user;
        await updateUser(userId, userWithoutTeamId);
      }
      
      // Refresh data
      const [updatedTeams, updatedUsers] = await Promise.all([
        getAllTeams(),
        getAllUsers()
      ]);
      setTeams(updatedTeams);
      setUsers(updatedUsers);
      
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

  const handleFixEmailVerification = async () => {
    setIsFixingEmailVerification(true);
    try {
      await ensureEmailVerificationEntries();
      toast({
        title: 'Email verification fixed',
        description: 'All users now have email verification entries.',
      });
    } catch (error) {
      console.error('Failed to fix email verification:', error);
      toast({
        title: 'Error',
        description: 'Failed to fix email verification entries. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsFixingEmailVerification(false);
    }
  };

  const handleListEmailVerification = async () => {
    try {
      const entries = await listEmailVerificationEntries();
      console.log('Email verification entries:', entries);
      toast({
        title: 'Email verification entries',
        description: `Found ${entries.length} entries. Check console for details.`,
      });
    } catch (error) {
      console.error('Failed to list email verification entries:', error);
      toast({
        title: 'Error',
        description: 'Failed to list email verification entries.',
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

  if (!currentUser || !isSuperUser(currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Access denied</div>
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
            <div className="flex items-center gap-3 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleListEmailVerification}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                List Email Entries
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFixEmailVerification}
                disabled={isFixingEmailVerification}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                {isFixingEmailVerification ? 'Fixing...' : 'Fix Email Verification'}
              </Button>
              <div className="flex items-center gap-3 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm rounded-full px-4 py-2 border border-primary/30">
                <Crown className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">Super Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-0 glass-light">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Building className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{teams.length}</p>
                    <p className="text-sm text-muted-foreground">Teams</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 glass-light">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Users</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 glass-light">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Globe className="h-8 w-8 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold">{communityPrompts.length}</p>
                    <p className="text-sm text-muted-foreground">Community Prompts</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 glass-light">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{teams.reduce((sum, team) => sum + team.members.length, 0)}</p>
                    <p className="text-sm text-muted-foreground">Total Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Management */}
          <Card className="border-0 glass-light">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Building className="h-6 w-6 text-primary" />
                Team Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Team */}
              <form onSubmit={handleCreateTeam} className="flex gap-3">
                <Input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Team
                </Button>
              </form>

              {/* Teams List */}
              <div className="space-y-4">
                {teams.map((team) => (
                  <Card key={team.id} className="border-0 glass-light">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between p-4">
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
                          <div>
                            <h3 className="font-semibold text-lg">{team.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {team.members.length} members • Created {new Date(team.createdAt || '').toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">{team.id}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive">
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
                      </div>

                      {expandedTeams[team.id] && (
                        <div className="space-y-3 border-t border-border/30 p-4">
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
            </CardContent>
          </Card>

          {/* Prompt Management */}
          <Card className="border-0 glass-light">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                Prompt Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Create Prompt */}
              <form onSubmit={handleCreatePrompt} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="prompt-title">Title</Label>
                    <Input
                      id="prompt-title"
                      placeholder="Prompt title"
                      value={newPromptTitle}
                      onChange={(e) => setNewPromptTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prompt-tags">Tags (comma-separated)</Label>
                    <Input
                      id="prompt-tags"
                      placeholder="tag1, tag2, tag3"
                      value={newPromptTags}
                      onChange={(e) => setNewPromptTags(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="prompt-content">Content</Label>
                  <Textarea
                    id="prompt-content"
                    placeholder="Prompt content"
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="prompt-sharing">Sharing</Label>
                    <Select value={promptSharing} onValueChange={(value: 'team' | 'global') => setPromptSharing(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Community (Global)</SelectItem>
                        <SelectItem value="team">Team Specific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {promptSharing === 'team' && (
                    <div className="flex-1">
                      <Label htmlFor="team-select">Target Team</Label>
                      <Select value={selectedTeamForPrompt} onValueChange={setSelectedTeamForPrompt}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Prompt
                  </Button>
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={handleCreateDemoPrompts}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {isLoading ? 'Creating...' : 'Add 8 Demo Prompts'}
                  </Button>
                </div>
              </form>

              {/* Bulk Prompt Creation */}
              <div className="space-y-4 border-t border-border/30 pt-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Bulk Prompt Creation</h3>
                  <Badge variant="outline">Beta</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Copy and paste multiple prompts at once. Supports various formats - see examples below.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-prompts">Bulk Prompts</Label>
                    <Textarea
                      id="bulk-prompts"
                      placeholder="Paste your prompts here... See format examples below."
                      value={bulkPromptText}
                      onChange={(e) => setBulkPromptText(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <Label htmlFor="bulk-sharing">Destination</Label>
                      <Select value={bulkPromptSharing} onValueChange={(value: 'team' | 'global') => setBulkPromptSharing(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="global">Community (Global)</SelectItem>
                          <SelectItem value="team">Team Specific</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {bulkPromptSharing === 'team' && (
                      <div className="flex-1">
                        <Label htmlFor="bulk-team-select">Target Team</Label>
                        <Select value={selectedTeamForBulkPrompts} onValueChange={setSelectedTeamForBulkPrompts}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    onClick={handleBulkCreatePrompts}
                    disabled={isProcessingBulkPrompts || !bulkPromptText.trim() || (bulkPromptSharing === 'team' && !selectedTeamForBulkPrompts)}
                    className="gap-2"
                  >
                    {isProcessingBulkPrompts ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Create Bulk Prompts
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Format Examples */}
                <div className="mt-4 p-4 bg-background/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Supported Formats:</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">Format 1: Structured with labels</p>
                      <pre className="bg-background/80 p-2 rounded mt-1 text-xs">
{`Title: Email Writer
Content: You are a professional email writer. Help me write emails that are clear, concise, and professional.
Tags: email, writing, professional

Title: Code Reviewer
Content: Review the following code and provide feedback on best practices, potential bugs, and improvements.
Tags: code, review, development`}
                      </pre>
                    </div>
                    <div>
                      <p className="font-medium">Format 2: Simple with separators</p>
                      <pre className="bg-background/80 p-2 rounded mt-1 text-xs">
{`Email Writer
You are a professional email writer. Help me write emails that are clear, concise, and professional.
---
Code Reviewer
Review the following code and provide feedback on best practices, potential bugs, and improvements.
---`}
                      </pre>
                    </div>
                    <div>
                      <p className="font-medium">Format 3: Line-by-line</p>
                      <pre className="bg-background/80 p-2 rounded mt-1 text-xs">
{`Email Writer
You are a professional email writer. Help me write emails that are clear, concise, and professional.

Code Reviewer
Review the following code and provide feedback on best practices, potential bugs, and improvements.`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Community Prompts */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Community Prompts ({communityPrompts.length})</h3>
                <div className="space-y-3">
                  {communityPrompts.slice(0, 5).map((prompt) => (
                    <div key={prompt.id} className="p-4 glass-light rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{prompt.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {prompt.tags.join(', ')} • Created by {getUserName(prompt.createdBy || '')}
                          </p>
                        </div>
                        <Badge variant="outline">Community</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}