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
import { getCurrentUser } from '@/lib/auth';
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
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const router = useRouter();

  // Get current user on component mount
  React.useEffect(() => {
    const initUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsLoading(false);
    };
    initUser();
  }, []);

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

  const addPrompt = async (prompt: Omit<Prompt, 'id' | 'sharing' | 'createdBy' | 'teamId'>) => {
    if (!currentUser) return;
    
    const newPrompt: Omit<Prompt, 'id'> = { 
      ...prompt, 
      sharing: 'private',
      createdBy: currentUser.id,
      teamId: currentUser.teamId
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
    }
  };

  const deletePromptHandler = async (id: string) => {
    try {
      await deletePrompt(id);
    } catch (error) {
      console.error('Failed to delete prompt:', error);
    }
  };
  
  const handleScopeChange = (scope: SharingScope) => {
    setSelectedScope(scope);
    setSelectedTag('All');
  };

  const scopeFilteredPrompts = React.useMemo(() => {
    // Prompts are already filtered by the database queries in useEffect
    return prompts;
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
        <Sidebar className="dark">
          <SidebarHeader>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <BookMarked className="size-8 text-primary" />
                <span className="text-lg font-semibold text-sidebar-foreground">
                  The Prompt Keeper
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/settings')}
                className="h-8 w-8"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {scopeData.map((scope) => (
                <SidebarMenuItem key={scope.id}>
                  <SidebarMenuButton
                    onClick={() => handleScopeChange(scope.id)}
                    isActive={selectedScope === scope.id}
                    className="gap-2"
                  >
                    <scope.icon className="size-4" />
                    <span>{scope.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Folders</SidebarGroupLabel>
              <SidebarMenu>
                {allTags.map((tag) => (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton
                      onClick={() => setSelectedTag(tag)}
                      isActive={selectedTag === tag}
                      className="gap-2"
                    >
                      <Folder className="size-4" />
                      <span>{tag}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        <div className="flex-1">
          <header className="flex items-center justify-between border-b p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden"/>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {scopeData.find(s => s.id === selectedScope)?.label}
                </h1>
                <p className="text-muted-foreground">
                  {selectedTag === 'All'
                    ? scopeData.find(s => s.id === selectedScope)?.description
                    : `Prompts tagged with "${selectedTag}"`}
                </p>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            {selectedScope === 'private' && <QuickPromptForm onAddPrompt={addPrompt} />}
            {filteredPrompts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {filteredPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onUpdatePrompt={updatePromptHandler}
                    onDeletePrompt={deletePromptHandler}
                    isEditable={selectedScope === 'private'}
                  />
                ))}
              </div>
            ) : (
              <Card className="w-full">
                <CardContent className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
                  <h2 className="text-xl font-semibold text-foreground">No Prompts Found</h2>
                  <p className="mt-2 max-w-md text-muted-foreground">
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
