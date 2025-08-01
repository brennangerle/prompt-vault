'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarSeparator, SidebarTrigger } from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PromptCard } from '@/components/prompt-card';
import { QuickPromptForm } from '@/components/quick-prompt-form';
import { NewPromptDialog } from '@/components/new-prompt-dialog';
import { AuthGuard } from '@/components/auth-guard';
import { 
  BookMarked, 
  UserIcon, 
  Users, 
  Globe, 
  Folder, 
  Settings, 
  LogOut, 
  ChevronUp, 
  Crown,
  Lock,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { 
  createPrompt, 
  updatePrompt, 
  deletePrompt, 
  subscribeToPrompts,
  getPromptsBySharing 
} from '@/lib/db';
import { useUser } from '@/lib/user-context';
import { isSuperUser, canEditPrompt, canDeletePrompt } from '@/lib/permissions';
import type { User } from '@/lib/types';

type SharingScope = 'private' | 'team' | 'community';

const scopeData: { id: SharingScope; label: string; icon: React.ElementType; description: string; }[] = [
  { id: 'private', label: 'My Prompt Repository', icon: UserIcon, description: 'Your personal collection. All prompts you created, regardless of sharing level.' },
  { id: 'team', label: 'Team Repository', icon: Users, description: 'Team prompts plus community prompts. Includes everything shared with your team.' },
  { id: 'community', label: 'Community Showcase', icon: Globe, description: 'Discover prompts shared by the entire community.' },
];

export default function PromptKeeperPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selectedTag, setSelectedTag] = React.useState<string | 'All'>('All');
  const [selectedScope, setSelectedScope] = React.useState<SharingScope>('private');
  const { currentUser, isLoading } = useUser();
  const router = useRouter();

  // Get all unique tags from prompts for filtering
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [prompts]);

  // Filter prompts by selected tag
  const filteredPrompts = React.useMemo(() => {
    if (selectedTag === 'All') return prompts;
    return prompts.filter(prompt => prompt.tags.includes(selectedTag));
  }, [prompts, selectedTag]);

  // Subscribe to prompts based on selected scope
  React.useEffect(() => {
    if (!currentUser) return;

    let unsubscribe: (() => void) | undefined;

    if (selectedScope === 'private') {
      // Subscribe to user's own prompts (all sharing levels for prompts they created)
      unsubscribe = subscribeToPrompts((userPrompts) => {
        setPrompts(userPrompts);
      }, currentUser.id);
    } else if (selectedScope === 'team') {
      // Subscribe to team prompts (team + global with cascading access)
      unsubscribe = subscribeToPrompts((teamPrompts) => {
        setPrompts(teamPrompts);
      }, undefined, 'team', currentUser.teamId);
    } else if (selectedScope === 'community') {
      // Subscribe to community prompts (global only)
      unsubscribe = subscribeToPrompts((globalPrompts) => {
        setPrompts(globalPrompts);
      }, undefined, 'global');
    }

    return unsubscribe;
  }, [selectedScope, currentUser]);

  const addPrompt = async (prompt: Omit<Prompt, 'id' | 'sharing' | 'createdBy' | 'teamId' | 'createdAt'>) => {
    if (!currentUser) return;
    
    const newPrompt: Omit<Prompt, 'id'> = { 
      ...prompt, 
      sharing: 'private',
      createdBy: currentUser.id,
      ...(currentUser.teamId && { teamId: currentUser.teamId })
    };
    
    try {
      await createPrompt(newPrompt);
    } catch (error) {
      console.error('Failed to create prompt:', error);
    }
  };

  const updatePromptHandler = async (updatedPrompt: Prompt) => {
    try {
      await updatePrompt(updatedPrompt.id, updatedPrompt);
    } catch (error) {
      console.error('Failed to update prompt:', error);
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to update prompt';
      if (errorMessage.includes('Unauthorized')) {
        alert('Only the prompt keeper can edit prompts.');
      } else {
        alert('Failed to update prompt. Please try again.');
      }
    }
  };

  const deletePromptHandler = async (id: string) => {
    try {
      await deletePrompt(id);
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete prompt';
      if (errorMessage.includes('Unauthorized')) {
        alert('Only the prompt keeper can delete prompts.');
      } else {
        alert('Failed to delete prompt. Please try again.');
      }
    }
  };
  
  const handleScopeChange = (scope: SharingScope) => {
    setSelectedScope(scope);
    setSelectedTag('All');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getSubscriptionType = () => {
    // TODO: Implement subscription logic
    return 'Free';
  };

  const getSubscriptionBadgeVariant = (type: string) => {
    switch (type) {
      case 'Pro': return 'default';
      case 'Max': return 'secondary';
      default: return 'outline';
    }
  };

  // Check if user has access to team features
  const hasTeamAccess = currentUser?.teamId;
  const isTeamScopeDisabled = !hasTeamAccess;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
        <Sidebar className="dark border-r border-sidebar-border/50">
          <SidebarHeader>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
                  <BookMarked className="size-7 text-primary animate-glow" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-sidebar-foreground to-primary bg-clip-text text-transparent">
                  The Prompt Keeper
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!isLoading && isSuperUser(currentUser) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/super-admin')}
                    className="h-10 w-10 rounded-full hover:bg-primary/20 transition-all duration-300 border border-border/30"
                  >
                    <Crown className="h-5 w-5 text-primary" />
                  </Button>
                )}
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu className="space-y-2">
              {scopeData.map((scope) => {
                const isDisabled = scope.id === 'team' && isTeamScopeDisabled;
                return (
                  <SidebarMenuItem key={scope.id}>
                    <SidebarMenuButton
                      onClick={() => !isDisabled && handleScopeChange(scope.id)}
                      isActive={selectedScope === scope.id}
                      disabled={isDisabled}
                      className={`gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                        isDisabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-sidebar-accent/20 data-[active=true]:bg-primary/20 data-[active=true]:text-primary data-[active=true]:shadow-lg'
                      }`}
                    >
                      <scope.icon className={`size-5 transition-colors duration-300 ${
                        isDisabled 
                          ? 'text-sidebar-foreground/30' 
                          : 'text-sidebar-foreground/70 group-hover:text-primary group-data-[active=true]:text-primary'
                      }`} />
                      <span className="font-medium">{scope.label}</span>
                      {isDisabled && (
                        <Lock className="size-4 text-sidebar-foreground/30 ml-auto" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            <SidebarSeparator className="my-6 bg-sidebar-border/30" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 text-sm font-semibold mb-3 px-4">Folders</SidebarGroupLabel>
              <SidebarMenu className="space-y-1">
                {allTags.map((tag) => (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton
                      onClick={() => setSelectedTag(tag)}
                      isActive={selectedTag === tag}
                      className="gap-3 px-4 py-2.5 rounded-lg hover:bg-sidebar-accent/10 transition-all duration-300 group data-[active=true]:bg-accent/20 data-[active=true]:text-accent"
                    >
                      <Folder className="size-4 text-sidebar-foreground/50 group-hover:text-accent group-data-[active=true]:text-accent transition-colors duration-300" />
                      <span className="text-sm">{tag}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="p-4">
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-sidebar-accent/20 transition-all duration-300 group cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <UserIcon className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-sidebar-foreground">
                          {currentUser.displayName || currentUser.email?.split('@')[0] || 'User'}
                        </p>
                        <Badge 
                          variant={getSubscriptionBadgeVariant(getSubscriptionType())}
                          className="text-xs px-2 py-0.5"
                        >
                          {getSubscriptionType()}
                        </Badge>
                      </div>
                      <p className="text-xs text-sidebar-foreground/60">
                        {currentUser.email}
                      </p>
                    </div>
                    <ChevronUp className="size-4 text-sidebar-foreground/70 group-hover:text-primary transition-colors duration-300" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-3 cursor-pointer">
                    <Settings className="size-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="gap-3 cursor-pointer">
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 flex flex-col">
          <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between p-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {scopeData.find(s => s.id === selectedScope)?.label}
                </h1>
                <p className="text-muted-foreground">
                  {scopeData.find(s => s.id === selectedScope)?.description}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {selectedTag !== 'All' && (
                  <Badge variant="secondary" className="gap-2">
                    <Folder className="size-3" />
                    {selectedTag}
                  </Badge>
                )}
                <NewPromptDialog onAddPrompt={addPrompt}>
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    New Prompt
                  </Button>
                </NewPromptDialog>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">
            {isTeamScopeDisabled && selectedScope === 'team' ? (
              <Card className="max-w-md mx-auto mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="size-5" />
                    Team Access Required
                  </CardTitle>
                  <CardDescription>
                    You need to be part of a team to access the Team Repository. Upgrade to Pro or Max to create and join teams.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => router.push('/pricing')} className="w-full gap-2">
                    <ArrowUpRight className="size-4" />
                    Upgrade to Access Teams
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-6">
                {filteredPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onUpdatePrompt={updatePromptHandler}
                    onDeletePrompt={deletePromptHandler}
                    isEditable={canEditPrompt(currentUser, prompt)}
                  />
                ))}
              </div>
            )}
            {filteredPrompts.length === 0 && !isTeamScopeDisabled && (
              <div className="text-center py-12">
                <BookMarked className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No prompts found</h3>
                <p className="text-muted-foreground">
                  {selectedTag !== 'All' 
                    ? `No prompts found with the "${selectedTag}" tag.`
                    : 'Create your first prompt to get started.'
                  }
                </p>
              </div>
            )}
          </main>
        </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
