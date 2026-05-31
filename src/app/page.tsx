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
  Search,
  X,
} from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import { logoutUser } from '@/lib/auth';
import { PromptCard } from '@/components/prompt-card';
import { QuickPromptForm } from '@/components/quick-prompt-form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import {
  subscribeToPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from '@/lib/db';
import { useUser } from '@/lib/user-context';
import { isSuperUser } from '@/lib/permissions';
import { useToast } from '@/hooks/use-toast';

type SharingScope = 'private' | 'team' | 'community';

const scopeData: { id: SharingScope; label: string; icon: React.ElementType; description: string; disabled?: boolean; requiresTeam?: boolean; }[] = [
  { id: 'private', label: 'My Prompt Library', icon: UserIcon, description: 'Your personal collection of prompts you created.' },
  { id: 'team', label: 'Team Library', icon: Users, description: 'Prompts shared with your team members.', requiresTeam: true },
  { id: 'community', label: 'Community Library', icon: Globe, description: 'Discover prompts shared with the entire community.' },
];

export default function PromptKeeperPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>([]);
  const [selectedTag, setSelectedTag] = React.useState<string | 'All'>('All');
  const [selectedScope, setSelectedScope] = React.useState<SharingScope>('private');
  const [searchQuery, setSearchQuery] = React.useState('');
  const { currentUser, isLoading } = useUser();
  const { toast } = useToast();
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
      // Subscribe to team prompts (requires user to have a teamId)
      if (currentUser.teamId) {
        unsubscribe = subscribeToPrompts((teamPrompts) => {
          // Filter to only show team prompts for the user's team
          const filtered = teamPrompts.filter(p =>
            p.sharing === 'team' && p.teamId === currentUser.teamId
          );
          setPrompts(filtered);
        }, undefined, 'team');
      } else {
        setPrompts([]);
      }
    } else if (selectedScope === 'community') {
      // Subscribe to community prompts (global only)
      unsubscribe = subscribeToPrompts((globalPrompts) => {
        setPrompts(globalPrompts);
      }, undefined, 'global');
    }

    return unsubscribe;
  }, [selectedScope, currentUser]);

  const addPrompt = async (prompt: Omit<Prompt, 'id' | 'sharing' | 'createdBy' | 'createdAt'>) => {
    if (!currentUser) return;
    
    const newPrompt: Omit<Prompt, 'id'> = { 
      ...prompt, 
      sharing: 'private',
      createdBy: currentUser.id
    };
    
    try {
      await createPrompt(newPrompt);
    } catch (error) {
      console.error('Failed to create prompt:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to add prompt',
        description: 'Something went wrong while saving. Please try again.',
      });
    }
  };

  const updatePromptHandler = async (updatedPrompt: Prompt) => {
    try {
      await updatePrompt(updatedPrompt.id, updatedPrompt);
    } catch (error) {
      console.error('Failed to update prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update prompt';
      toast({
        variant: 'destructive',
        title: 'Failed to update prompt',
        description: errorMessage.includes('Unauthorized')
          ? 'Only the prompt keeper can edit this prompt.'
          : 'Something went wrong. Please try again.',
      });
    }
  };

  const deletePromptHandler = async (id: string) => {
    try {
      await deletePrompt(id);
      toast({
        title: 'Prompt deleted',
        description: 'The prompt has been removed from your library.',
      });
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete prompt';
      toast({
        variant: 'destructive',
        title: 'Failed to delete prompt',
        description: errorMessage.includes('Unauthorized')
          ? 'Only the prompt keeper can delete this prompt.'
          : 'Something went wrong. Please try again.',
      });
    }
  };

  const handleScopeChange = (scope: SharingScope) => {
    setSelectedScope(scope);
    setSelectedTag('All');
    setSearchQuery('');
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

  const filteredPrompts = React.useMemo(() => {
    const byTag = selectedTag === 'All'
      ? scopeFilteredPrompts
      : scopeFilteredPrompts.filter((p) => p.tags.includes(selectedTag));

    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return byTag;

    return byTag.filter((p) =>
      p.title.toLowerCase().includes(trimmedQuery) ||
      p.content.toLowerCase().includes(trimmedQuery) ||
      p.tags.some((tag) => tag.toLowerCase().includes(trimmedQuery)) ||
      (p.software?.toLowerCase().includes(trimmedQuery) ?? false)
    );
  }, [scopeFilteredPrompts, selectedTag, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen">
        <Sidebar className="dark border-r border-sidebar-border/50">
          <SidebarHeader>
            <div className="flex items-center justify-between p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2 rounded-xl bg-primary/20 backdrop-blur-sm shrink-0">
                  <BookMarked className="size-5 sm:size-7 text-primary animate-glow" />
                </div>
                <span className="text-base sm:text-xl font-bold text-sidebar-foreground bg-gradient-to-r from-sidebar-foreground to-primary bg-clip-text text-transparent truncate">
                  The Prompt Keeper
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                {!isLoading && isSuperUser(currentUser) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/super-admin')}
                    className="h-10 w-10 rounded-full hover:bg-primary/20 transition-all duration-300 border border-border/30 touch-manipulation"
                  >
                    <Crown className="h-5 w-5 text-primary" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/settings')}
                  className="h-10 w-10 rounded-full hover:bg-sidebar-accent/20 transition-all duration-300 border border-sidebar-border/30 touch-manipulation"
                >
                  <Settings className="h-5 w-5 text-sidebar-foreground/70 hover:text-primary transition-colors duration-300" />
                </Button>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="px-2 sm:px-3">
            <SidebarMenu className="space-y-1 sm:space-y-2">
              {scopeData.map((scope) => {
                const isDisabled = scope.disabled || (scope.requiresTeam && !currentUser?.teamId);
                return (
                  <SidebarMenuItem key={scope.id}>
                    <SidebarMenuButton
                      onClick={isDisabled ? undefined : () => handleScopeChange(scope.id)}
                      isActive={selectedScope === scope.id && !isDisabled}
                      disabled={isDisabled}
                      className={`gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-3 rounded-xl transition-all duration-300 group touch-manipulation ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                          : 'hover:bg-sidebar-accent/20 data-[active=true]:bg-primary/20 data-[active=true]:text-primary data-[active=true]:shadow-lg'
                      }`}
                    >
                      <scope.icon className={`size-5 transition-colors duration-300 shrink-0 ${
                        isDisabled
                          ? 'text-muted-foreground'
                          : 'text-sidebar-foreground/70 group-hover:text-primary group-data-[active=true]:text-primary'
                      }`} />
                      <span className="font-medium text-sm sm:text-base truncate">{scope.label}</span>
                      {scope.requiresTeam && !currentUser?.teamId && (
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">(No team)</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
            <SidebarSeparator className="my-4 sm:my-6 bg-sidebar-border/30" />
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs sm:text-sm font-semibold mb-2 sm:mb-3 px-3 sm:px-4">Folders</SidebarGroupLabel>
              <SidebarMenu className="space-y-0.5 sm:space-y-1">
                {allTags.map((tag) => (
                  <SidebarMenuItem key={tag}>
                    <SidebarMenuButton
                      onClick={() => setSelectedTag(tag)}
                      isActive={selectedTag === tag}
                      className="gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-2.5 rounded-lg hover:bg-sidebar-accent/10 transition-all duration-300 group data-[active=true]:bg-accent/20 data-[active=true]:text-accent touch-manipulation"
                    >
                      <Folder className="size-4 text-sidebar-foreground/50 group-hover:text-accent group-data-[active=true]:text-accent transition-colors duration-300 shrink-0" />
                      <span className="text-sm truncate">{tag}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border/30 p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-sidebar-foreground truncate">{currentUser?.email}</p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">{currentUser?.role || 'User'}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await logoutUser();
                  router.push('/login');
                }}
                className="h-10 w-10 sm:h-8 sm:w-8 rounded-full hover:bg-destructive/10 hover:text-destructive shrink-0 touch-manipulation"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <div className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 min-w-0">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/50 backdrop-blur-md bg-background/80 p-4 sm:p-6 lg:p-8">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger className="md:hidden h-10 w-10 rounded-xl hover:bg-primary/10 transition-all duration-300 shrink-0 touch-manipulation"/>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent truncate">
                      {scopeData.find(s => s.id === selectedScope)?.label}
                  </h1>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 w-fit shrink-0">
                    {filteredPrompts.length} {filteredPrompts.length === 1 ? 'prompt' : 'prompts'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 font-medium text-xs sm:text-sm lg:text-base line-clamp-2 sm:line-clamp-1">
                    {selectedTag === 'All'
                      ? scopeData.find(s => s.id === selectedScope)?.description
                      : `Prompts tagged with "${selectedTag}"`}
                </p>
              </div>
            </div>
            <div className="relative w-full max-w-[200px] sm:max-w-xs shrink-0 ml-2 sm:ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                aria-label="Search prompts"
                className="h-10 pl-9 pr-9 bg-background/60 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300"
              />
              {isSearching && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full hover:bg-muted touch-manipulation"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
              {selectedScope === 'private' && <QuickPromptForm onAddPrompt={addPrompt} />}
            {filteredPrompts.length > 0 ? (
              <div className="flex flex-col gap-4 sm:gap-6">
                {filteredPrompts.map((prompt) => (
                                    <PromptCard
                     key={prompt.id}
                     prompt={prompt}
                     onUpdatePrompt={updatePromptHandler}
                     onDeletePrompt={deletePromptHandler}
                   />
                ))}
              </div>
            ) : (
              <Card className="w-full border-0 glass-light">
                <CardContent className="flex min-h-[240px] sm:min-h-[280px] flex-col items-center justify-center p-6 sm:p-8 lg:p-12 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 sm:mb-6">
                    {isSearching ? (
                      <Search className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    ) : selectedScope === 'private' ? (
                      <UserIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    ) : selectedScope === 'team' ? (
                      <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    ) : (
                      <Globe className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">
                    {isSearching
                      ? 'No Matching Prompts'
                      : selectedScope === 'private'
                      ? 'Start Your Collection'
                      : selectedScope === 'team'
                      ? 'No Team Prompts Yet'
                      : 'Explore the Community'}
                  </h2>
                  <p className="mt-1 sm:mt-2 max-w-md text-sm sm:text-base text-muted-foreground leading-relaxed mb-4 sm:mb-6">
                    {isSearching
                      ? `No prompts match "${searchQuery.trim()}". Try a different search term.`
                      : selectedScope === 'private'
                      ? 'Add your first prompt above to start building your personal library. Your prompts are private by default.'
                      : selectedScope === 'team'
                      ? 'Your team hasn\'t shared any prompts yet. Create a prompt and share it with your team.'
                      : 'No community prompts available. Be the first to share a prompt with the community!'}
                  </p>
                  {isSearching ? (
                    <Button
                      onClick={() => setSearchQuery('')}
                      variant="outline"
                      className="gap-2 w-full sm:w-auto h-11 sm:h-10"
                    >
                      <X className="h-4 w-4" />
                      Clear Search
                    </Button>
                  ) : selectedScope !== 'private' && (
                    <Button
                      onClick={() => handleScopeChange('private')}
                      className="gap-2 w-full sm:w-auto h-11 sm:h-10"
                    >
                      <UserIcon className="h-4 w-4" />
                      Go to My Library
                    </Button>
                  )}
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
