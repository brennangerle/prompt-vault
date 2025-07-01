'use client';

import * as React from 'react';
import type { Prompt } from '@/lib/types';
import {
  Folder,
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
} from '@/components/ui/sidebar';
import { PromptCard } from '@/components/prompt-card';
import { VaultIcon } from '@/components/icons';
import { QuickPromptForm } from '@/components/quick-prompt-form';

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
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <QuickPromptForm onAddPrompt={addPrompt} />
            {filteredPrompts.length > 0 ? (
              <div className="flex flex-col gap-4">
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
              <div className="flex min-h-[240px] w-full flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
                <h2 className="text-xl font-semibold text-foreground">Your Vault is Empty</h2>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Add a new prompt using the form above to get started.
                </p>
              </div>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
