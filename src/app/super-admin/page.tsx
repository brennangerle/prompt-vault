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
  getPromptsBySharing
} from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { canAccessSuperAdmin, isSuperUser } from '@/lib/permissions';
import type { Team, User, TeamMember, Prompt } from '@/lib/types';

export default function SuperAdminPage() {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [users, setUsers] = React.useState<User[]>([]);
  const [communityPrompts, setCommunityPrompts] = React.useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [newTeamName, setNewTeamName] = React.useState('');
  const [newPromptTitle, setNewPromptTitle] = React.useState('');
  const [newPromptContent, setNewPromptContent] = React.useState('');
  const [newPromptTags, setNewPromptTags] = React.useState('');
  const [selectedTeamForPrompt, setSelectedTeamForPrompt] = React.useState<string>('');
  const [promptSharing, setPromptSharing] = React.useState<'team' | 'global'>('global');
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    const initData = async () => {
      try {
        const user = await getCurrentUser();
        if (!user || !canAccessSuperAdmin(user)) {
          router.push('/');
          return;
        }
        
        setCurrentUser(user);
        
        // Load all data
        const [teamsData, usersData, communityData] = await Promise.all([
          getAllTeams(),
          getAllUsers(),
          getPromptsBySharing('global')
        ]);
        
        setTeams(teamsData);
        setUsers(usersData);
        setCommunityPrompts(communityData);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load super admin data:', error);
        setIsLoading(false);
      }
    };
    
    initData();
  }, [router]);

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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
            <div className="flex items-center gap-3 ml-auto bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur-sm rounded-full px-4 py-2 border border-primary/30">
              <Crown className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Super Admin</span>
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
                  <div key={team.id} className="flex items-center justify-between p-4 glass-light rounded-xl">
                    <div className="flex items-center gap-4">
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
                            {prompt.tags.join(', ')} • Created by {prompt.createdBy}
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