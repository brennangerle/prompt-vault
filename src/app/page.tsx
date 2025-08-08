'use client';

import * as React from 'react';
import type { Prompt } from '@/lib/types';
import {
  BookMarked,
  Folder,
  Globe,
  User as UserIcon,
  Users,
  Settings,
  Crown,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { PromptCard } from '@/components/prompt-card';
import { QuickPromptForm } from '@/components/quick-prompt-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { 
  subscribeToPrompts, 
  createPrompt, 
  updatePrompt, 
  deletePrompt,
  getPromptsBySharing 
} from '@/lib/db';
import { useUser } from '@/lib/user-context';
import { isSuperUser, canEditPrompt, canDeletePrompt } from '@/lib/permissions';
import type { User } from '@/lib/types';

type SharingScope = 'private' | 'team' | 'community';

const scopeData: { id: SharingScope; label: string; icon: React.ElementType; description: string; disabled?: boolean; }[] = [
  { id: 'private', label: 'My Prompt Repository', icon: UserIcon, description: 'Your personal collection. All prompts you created, regardless of sharing level.' },
  { id: 'team', label: 'Team Repository', icon: Users, description: "Team prompts from your team plus community prompts." },
  { id: 'community', label: 'Community Showcase', icon: Globe, description: 'Discover prompts shared by the entire community.' },
];

export default function PromptKeeperPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selectedTag, setSelectedTag] = React.useState<string | 'All'>('All');
  const [selectedScope, setSelectedScope] = React.useState<SharingScope>('private');
  const { currentUser, isLoading } = useUser();
  const router = useRouter();

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

  const scopeFilteredPrompts = React.useMemo(() => {
    // Prompts are already filtered by the database queries in useEffect
    // Sort by createdAt in descending order (newest first)
    return [...prompts].sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [prompts]);
  
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    scopeFilteredPrompts.forEach(p => p.tags.forEach(tag => tagsSet.add(tag)));
    return ['All', ...Array.from(tagsSet).sort()];
  }, [scopeFilteredPrompts]);

  const filteredPrompts = React.useMemo(() =>
    selectedTag === 'All'
      ? scopeFilteredPrompts
      : scopeFilteredPrompts.filter((p) => p.tags.includes(selectedTag))
  , [scopeFilteredPrompts, selectedTag]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
        <Sidebar className="dark border-r border-sidebar-border/50">
          <SidebarHeader>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/20 backdrop-blur-sm">
                  <BookMarked className="size-7 text-primary animate-glow" />
                </div>
                <span className="text-xl font-bold text-sidebar-foreground bg-gradient-to-r from-sidebar-foreground to-primary bg-clip-text text-transparent">
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/settings')}
                  className="h-10 w-10 rounded-full hover:bg-sidebar-accent/20 transition-all duration-300 border border-sidebar-border/30"
                >
                  <Settings className="h-5 w-5 text-sidebar-foreground/70 hover:text-primary transition-colors duration-300" />
                </Button>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-3">
            <SidebarMenu className="space-y-2">
              {scopeData.map((scope) => (
                <SidebarMenuItem key={scope.id}>
                  <SidebarMenuButton
                    onClick={scope.disabled ? undefined : () => handleScopeChange(scope.id)}
                    isActive={selectedScope === scope.id && !scope.disabled}
                    disabled={scope.disabled}
                    className={`gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      scope.disabled 
                        ? 'opacity-50 cursor-not-allowed text-muted-foreground' 
                        : 'hover:bg-sidebar-accent/20 data-[active=true]:bg-primary/20 data-[active=true]:text-primary data-[active=true]:shadow-lg'
                    }`}
                  >
                    <scope.icon className={`size-5 transition-colors duration-300 ${
                      scope.disabled 
                        ? 'text-muted-foreground' 
                        : 'text-sidebar-foreground/70 group-hover:text-primary group-data-[active=true]:text-primary'
                    }`} />
                    <span className="font-medium">{scope.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
        </Sidebar>
        <div className="flex-1 bg-gradient-to-br from-background via-background to-primary/5">
          <header className="flex items-center justify-between border-b border-border/50 backdrop-blur-sm bg-background/80 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden h-10 w-10 rounded-xl hover:bg-primary/10 transition-all duration-300"/>
              <div>
                <h1 className="text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  {scopeData.find(s => s.id === selectedScope)?.label}
                </h1>
                <p className="text-muted-foreground mt-1 font-medium">
                  {selectedTag === 'All'
                    ? scopeData.find(s => s.id === selectedScope)?.description
                    : `Prompts tagged with "${selectedTag}"`}
                </p>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
            {selectedScope === 'private' && <QuickPromptForm onAddPrompt={addPrompt} />}
            {filteredPrompts.length > 0 ? (
              <div className="flex flex-col gap-6">
                {filteredPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onUpdatePrompt={updatePromptHandler}
                    onDeletePrompt={deletePromptHandler}
                    isEditable={canEditPrompt(currentUser)}
                  />
                ))}
              </div>
            ) : (
              <Card className="w-full border-0 glass-light">
                <CardContent className="flex min-h-[280px] flex-col items-center justify-center p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <BookMarked className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">No Prompts Found</h2>
                  <p className="mt-2 max-w-md text-muted-foreground leading-relaxed">
                    There are no prompts in this view. Try a different scope or add a new prompt to your private repository.
                  </p>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
