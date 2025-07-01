'use client';

import * as React from 'react';
import type { Prompt } from '@/lib/types';
import {
  Folder,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NewPromptDialog } from '@/components/new-prompt-dialog';
import { PromptCard } from '@/components/prompt-card';
import { VaultIcon } from '@/components/icons';

const initialPrompts: Prompt[] = [];

export default function PromptVaultPage() {
  const [prompts, setPrompts] = React.useState<Prompt[]>(initialPrompts);
  const [selectedTag, setSelectedTag] = React.useState<string | 'All'>('All');

  const addPrompt = (prompt: Omit<Prompt, 'id'>) => {
    const newPrompt = { ...prompt, id: Date.now().toString() };
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
  
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    prompts.forEach(p => p.tags.forEach(tag => tagsSet.add(tag)));
    return ['All', ...Array.from(tagsSet).sort()];
  }, [prompts]);

  const filteredPrompts =
    selectedTag === 'All'
      ? prompts
      : prompts.filter((p) => p.tags.includes(selectedTag));

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <Sidebar className="dark" variant="sidebar" collapsible="icon">
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
          </SidebarContent>
          <SidebarFooter>
             <NewPromptDialog onAddPrompt={addPrompt}>
                <Button className="w-full gap-2">
                    <Plus /> New Prompt
                </Button>
            </NewPromptDialog>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1">
          <header className="flex items-center justify-between border-b p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden"/>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedTag} Prompts
                </h1>
                <p className="text-muted-foreground">
                  Browse and manage your saved prompts.
                </p>
              </div>
            </div>
            <div className="md:hidden">
                <NewPromptDialog onAddPrompt={addPrompt}>
                    <Button size="icon">
                        <Plus />
                        <span className="sr-only">New Prompt</span>
                    </Button>
                </NewPromptDialog>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            {filteredPrompts.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPrompts.map((prompt) => (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    onUpdatePrompt={updatePrompt}
                    onDeletePrompt={deletePrompt}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[50vh] flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card">
                <h2 className="text-xl font-medium">No Prompts Found</h2>
                <p className="text-muted-foreground">
                  Add a new prompt to get started.
                </p>
                <NewPromptDialog onAddPrompt={addPrompt}>
                    <Button className="mt-4 gap-2">
                        <Plus /> Add Prompt
                    </Button>
                </NewPromptDialog>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
