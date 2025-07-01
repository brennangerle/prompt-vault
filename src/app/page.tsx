'use client';

import * as React from 'react';
import type { Prompt } from '@/lib/types';
import {
  Folder,
  Globe,
  User,
  Users,
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
} from '@/components/ui/sidebar';
import { PromptCard } from '@/components/prompt-card';
import { VaultIcon } from '@/components/icons';
import { QuickPromptForm } from '@/components/quick-prompt-form';

const initialPrompts: Prompt[] = [];
type SharingScope = 'private' | 'team' | 'community';

const scopeData: { id: SharingScope; label: string; icon: React.ElementType }[] = [
  { id: 'private', label: 'My Vault', icon: User },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'community', label: 'Community', icon: Globe },
];

export default function PromptVaultPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>(initialPrompts);
  const [selectedTag, setSelectedTag] = React.useState<string | 'All'>('All');
  const [selectedScope, setSelectedScope] = React.useState<SharingScope>('private');

  const addPrompt = (prompt: Omit<Prompt, 'id' | 'sharing'>) => {
    const newPrompt: Prompt = { 
      ...prompt, 
      id: Date.now().toString(),
      sharing: 'private' 
    };
    setPrompts((prev) => [newPrompt, ...prev]);
  };

  const updatePrompt = (updatedPrompt: Prompt) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p))
    );
  };

  const deletePrompt = (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id));
  };
  
  const handleScopeChange = (scope: SharingScope) => {
    setSelectedScope(scope);
    setSelectedTag('All');
  };

  const scopeFilteredPrompts = React.useMemo(() => {
    if (selectedScope === 'private') {
      // "My Vault" shows all prompts created by the user, regardless of sharing status.
      return prompts;
    }
    // "Team" and "Community" views only show prompts with the corresponding sharing status.
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
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="dark">
          <SidebarHeader>
            <div className="flex items-center gap-2 p-2">
              <VaultIcon className="size-8 text-primary" />
              <span className="text-lg font-semibold text-sidebar-foreground">
                Prompt Vault
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
                    ? 'All Prompts'
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
                    onUpdatePrompt={updatePrompt}
                    onDeletePrompt={deletePrompt}
                    isEditable={selectedScope === 'private'}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
                <h2 className="text-xl font-semibold text-foreground">No Prompts Found</h2>
                <p className="mt-2 max-w-md text-muted-foreground">
                  There are no prompts in this view. Try a different scope or add a new prompt to your private vault.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
