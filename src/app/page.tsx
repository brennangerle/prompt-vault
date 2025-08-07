'use client';

import * as React from 'react';
import type { Prompt } from '@/lib/types';
import {
  BookMarked,
  Folder,
  Globe,
  User,
  Users,
  LogOut,
  Settings,
} from 'lucide-react';
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
  SidebarFooter,
} from '@/components/ui/sidebar';
import { PromptCard } from '@/components/prompt-card';
import { QuickPromptForm } from '@/components/quick-prompt-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { AuthGuard } from '@/components/auth-guard';
import { subscribeToPrompts, createPrompt, updatePrompt as updatePromptDb, deletePrompt as deletePromptDb } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

type SharingScope = 'private' | 'team' | 'community';

const scopeData: { id: SharingScope; label: string; icon: React.ElementType; description: string; }[] = [
  { id: 'private', label: 'My Prompt Repository', icon: User, description: 'Your personal collection. Only you can see and edit these prompts.' },
  { id: 'team', label: 'Team Repository', icon: Users, description: 'Prompts shared with your team. Viewable by all team members.' },
  { id: 'community', label: 'Community Showcase', icon: Globe, description: 'Discover prompts shared by the entire community.' },
];

export default function PromptKeeperPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selectedTag, setSelectedTag] = React.useState<string | 'All'>('All');
  const [selectedScope, setSelectedScope] = React.useState<SharingScope>('private');
  const [isLoading, setIsLoading] = React.useState(true);
  const { user, logout, teamId } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Subscribe to prompts based on scope
  React.useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const scope = selectedScope === 'community' ? 'global' : selectedScope;
    
    const unsubscribe = subscribeToPrompts(
      user.uid,
      teamId,
      scope as 'private' | 'team' | 'global',
      (fetchedPrompts) => {
        setPrompts(fetchedPrompts);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedScope, teamId]);

  const addPrompt = async (prompt: Omit<Prompt, 'id' | 'sharing'>) => {
    if (!user) return;
    
    try {
      await createPrompt(user.uid, teamId, { ...prompt, sharing: 'private' });
      toast({
        title: 'Prompt created',
        description: 'Your prompt has been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create prompt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updatePrompt = async (updatedPrompt: Prompt) => {
    try {
      await updatePromptDb(updatedPrompt.id, updatedPrompt);
      toast({
        title: 'Prompt updated',
        description: 'Your changes have been saved.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update prompt. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      await deletePromptDb(id);
      toast({
        title: 'Prompt deleted',
        description: 'The prompt has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete prompt. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const handleScopeChange = (scope: SharingScope) => {
    setSelectedScope(scope);
    setSelectedTag('All');
  };

  const scopeFilteredPrompts = React.useMemo(() => {
    if (selectedScope === 'private') {
      // "My Keeper" shows all prompts created by the user, regardless of sharing status.
      return prompts;
    }
    if (selectedScope === 'community') {
      return prompts.filter(p => p.sharing === 'global');
    }
    // "Team" view only shows prompts with the corresponding sharing status.
    return prompts.filter(p => p.sharing === selectedScope);
  }, [prompts, selectedScope]);
  
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

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
          <Sidebar className="dark">
            <SidebarHeader>
              <div className="flex items-center gap-2 p-2">
                <BookMarked className="size-8 text-primary" />
                <span className="text-lg font-semibold text-sidebar-foreground">
                  The Prompt Keeper
                </span>
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
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex flex-col gap-2 p-2">
                  <div className="text-sm text-sidebar-foreground">
                    {user?.email}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => router.push('/settings')}
                    >
                      <Settings className="size-4 mr-2" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={logout}
                    >
                      <LogOut className="size-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
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
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredPrompts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {filteredPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onUpdatePrompt={updatePrompt}
                    onDeletePrompt={deletePrompt}
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
