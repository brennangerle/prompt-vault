'use client';

import * as React from 'react';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Wand2, MoreVertical, Trash2, Pencil, BrainCircuit, Globe, Lock, Users, ChevronDown, ChevronUp } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { EditPromptDialog } from './edit-prompt-dialog';
import { DeletePromptDialog } from './delete-prompt-dialog';
import { canEditPrompt, canDeletePrompt } from '@/lib/permissions';
import { useUser } from '@/lib/user-context';
import clsx from 'clsx';

interface PromptCardProps {
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
}

export function PromptCard({ prompt, onUpdatePrompt, onDeletePrompt }: PromptCardProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const { currentUser } = useUser();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(prompt.content);
      } else {
        // Fallback for insecure contexts (e.g. plain HTTP) where the
        // Clipboard API is unavailable.
        const textarea = document.createElement('textarea');
        textarea.value = prompt.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!succeeded) throw new Error('Copy command was rejected.');
      }
      setIsCopied(true);
      toast({ title: 'Copied to clipboard!' });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Unable to copy to clipboard. Please copy the text manually.',
      });
    }
  };

  const handleUpdateContent = (newContent: string) => {
    onUpdatePrompt({ ...prompt, content: newContent });
  };

  const handleSharingChange = (newSharing: 'private' | 'team' | 'global') => {
    if (prompt.sharing === newSharing) return;

    const updatedPrompt = { ...prompt, sharing: newSharing };
    // Add teamId if sharing to team and user has a team
    if (newSharing === 'team' && currentUser?.teamId) {
      updatedPrompt.teamId = currentUser.teamId;
    } else if (newSharing !== 'team') {
      delete updatedPrompt.teamId;
    }

    onUpdatePrompt(updatedPrompt);

    const messages: Record<string, { title: string; description: string }> = {
      private: { title: 'Made Private', description: 'Your prompt is now private.' },
      team: { title: 'Shared with Team', description: 'Your prompt is now visible to team members.' },
      global: { title: 'Shared to Community', description: 'Your prompt is now visible to everyone.' },
    };
    toast(messages[newSharing]);
  };

  // Check if current user can edit/delete prompts
  const canEdit = canEditPrompt(currentUser, prompt);
  const canDelete = canDeletePrompt(currentUser, prompt);

  return (
    <Card className="w-full group transition-all duration-300 ease-out hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-0.5 border border-border/50 bg-card/50 backdrop-blur-sm">
      {/* Collapsed View - Always visible */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2 sm:truncate pr-2">{prompt.title}</CardTitle>
          {isExpanded && (
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 sm:mt-3">
              {prompt.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-primary/5 hover:bg-primary/10 text-foreground/80 transition-colors duration-200 font-medium text-xs">
                  {tag}
                </Badge>
              ))}
              {prompt.software && (
                <Badge variant="outline" className="gap-1.5 pl-2 border-primary/30 text-primary hover:bg-primary/10 transition-colors duration-200">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  {prompt.software}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Sharing indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1.5 sm:space-x-2 bg-background/50 backdrop-blur-sm rounded-full px-2 sm:px-2.5 py-1 sm:py-1.5 border border-border/30">
                    {prompt.sharing === 'global' ? (
                      <Globe className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-emerald-500" />
                    ) : prompt.sharing === 'team' ? (
                      <Users className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-blue-500" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                    )}
                    <span className={`text-xs font-medium ${
                      prompt.sharing === 'global' ? 'text-emerald-600' :
                      prompt.sharing === 'team' ? 'text-blue-600' : 'text-muted-foreground'
                    }`}>
                      {prompt.sharing === 'global' ? 'Community' :
                       prompt.sharing === 'team' ? 'Team' : 'Private'}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{prompt.sharing === 'global' ? 'Shared with the community' :
                      prompt.sharing === 'team' ? 'Shared with your team' : 'Visible only to you'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

          {/* Copy Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:glow-primary transition-all duration-300 border border-border/30 touch-manipulation"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 sm:h-3.5 sm:w-3.5 group-hover:text-primary transition-colors duration-300" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Full Prompt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Expand/Collapse Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 sm:h-8 sm:w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300 border border-border/30 touch-manipulation"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 sm:h-3.5 sm:w-3.5 group-hover:text-primary transition-colors duration-300" />
                  ) : (
                    <ChevronDown className="h-4 w-4 sm:h-3.5 sm:w-3.5 group-hover:text-primary transition-colors duration-300" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? 'Collapse' : 'Expand'} content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 3-Dots Menu */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300 border border-border/30 shrink-0 touch-manipulation">
                  <MoreVertical className="h-4 w-4 sm:h-3.5 sm:w-3.5 group-hover:text-primary transition-colors duration-300" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EditPromptDialog prompt={prompt} onUpdatePrompt={onUpdatePrompt}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                </EditPromptDialog>
                <OptimizePromptDialog
                  promptContent={prompt.content}
                  onApply={handleUpdateContent}
                >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Wand2 className="mr-2 h-4 w-4" />
                    <span>Optimize</span>
                  </DropdownMenuItem>
                </OptimizePromptDialog>
                {canEdit && (
                  <>
                    {prompt.sharing !== 'private' && (
                      <DropdownMenuItem onClick={() => handleSharingChange('private')}>
                        <Lock className="mr-2 h-4 w-4" />
                        <span>Make Private</span>
                      </DropdownMenuItem>
                    )}
                    {prompt.sharing !== 'team' && currentUser?.teamId && (
                      <DropdownMenuItem onClick={() => handleSharingChange('team')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Share with Team</span>
                      </DropdownMenuItem>
                    )}
                    {prompt.sharing !== 'global' && (
                      <DropdownMenuItem onClick={() => handleSharingChange('global')}>
                        <Globe className="mr-2 h-4 w-4" />
                        <span>Share to Community</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                {canDelete && (
                  <DeletePromptDialog onDelete={() => onDeletePrompt(prompt.id)}>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DeletePromptDialog>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Expanded View - Only visible when expanded */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4 border-t border-border/30 pt-3 sm:pt-4 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <pre className="text-xs sm:text-sm text-foreground/80 whitespace-pre-wrap break-words font-mono bg-muted/40 p-3 sm:p-4 rounded-lg border border-border/30 leading-relaxed max-h-[300px] sm:max-h-[400px] overflow-y-auto">
              {prompt.content}
            </pre>
          </div>
          {prompt.createdAt && (
            <p className="text-xs text-muted-foreground">
              Created {new Date(prompt.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}