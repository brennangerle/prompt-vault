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
import { Copy, Check, Wand2, MoreVertical, Trash2, Pencil, BrainCircuit, Globe, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { EditPromptDialog } from './edit-prompt-dialog';
import { DeletePromptDialog } from './delete-prompt-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setIsCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleUpdateContent = (newContent: string) => {
    onUpdatePrompt({ ...prompt, content: newContent });
  };

  const handleSharingChange = (isTeam: boolean) => {
    if (prompt.sharing !== 'global' && canEdit) {
      const updates: Partial<Prompt> = {
        sharing: isTeam ? 'team' : 'private'
      };

      // When enabling team sharing, ensure teamId exists on the prompt by inheriting current user's teamId
      if (isTeam && !prompt.teamId && currentUser?.teamId) {
        updates.teamId = currentUser.teamId;
      }
      
      onUpdatePrompt({ ...prompt, ...updates });
      
      toast({
        title: isTeam ? 'Copied to Team' : 'Moved to Private',
        description: isTeam ? 'Your prompt is now visible to your team.' : 'Your prompt is now private.',
      });
    }
  };

  const handleGlobalShare = () => {
    if (prompt.sharing === 'global') {
      // Unshare from community - return to private
      onUpdatePrompt({ ...prompt, sharing: 'private' });
      toast({
        title: 'Removed from Community',
        description: 'Your prompt is now private.',
      });
    } else {
      // Share to community
      onUpdatePrompt({ ...prompt, sharing: 'global' });
      toast({
        title: 'Shared to Community',
        description: 'Your prompt is now visible to everyone.',
      });
    }
  };

  // Check if current user can edit/delete prompts
  const canEdit = canEditPrompt(currentUser, prompt);
  const canDelete = canDeletePrompt(currentUser, prompt);

  return (
    <Card className="w-full group transition-all-smooth hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-0 glass-light">
      {/* Collapsed View - Always visible */}
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300 truncate pr-2">{prompt.title}</CardTitle>
          {isExpanded && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {prompt.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="bg-secondary/80 hover:bg-secondary transition-colors duration-200 font-medium text-xs">
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
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Sharing/Permissions Indicator */}
          {canEdit && prompt.sharing !== 'global' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 bg-background/50 backdrop-blur-sm rounded-full px-2.5 py-1.5 border border-border/30">
                    <Switch
                      id={`sharing-switch-${prompt.id}`}
                      checked={prompt.sharing === 'team'}
                      onCheckedChange={handleSharingChange}
                      aria-label="Copy to team repository"
                      className="scale-75"
                    />
                    <Label htmlFor={`sharing-switch-${prompt.id}`} className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                      {prompt.sharing === 'private' && 'Private'}
                      {prompt.sharing === 'team' && 'Team'}
                    </Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle to share with your team</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Global sharing indicator */}
          {prompt.sharing === 'global' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-2 bg-background/50 backdrop-blur-sm rounded-full px-2.5 py-1.5 border border-border/30">
                    <Globe className="h-3 w-3 text-emerald-500" />
                    <Label className="text-xs text-muted-foreground whitespace-nowrap font-medium">Community</Label>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Shared with the community</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Copy Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:glow-primary transition-all duration-300 border border-border/30"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
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
                  className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300 border border-border/30"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
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
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300 border border-border/30 shrink-0">
                  <MoreVertical className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-300" />
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
                    <DropdownMenuItem onClick={handleGlobalShare}>
                      {prompt.sharing === 'global' ? (
                        <Lock className="mr-2 h-4 w-4" />
                      ) : (
                        <Globe className="mr-2 h-4 w-4" />
                      )}
                      <span>
                        {prompt.sharing === 'global' ? 'Remove from Community' : 'Share to Community'}
                      </span>
                    </DropdownMenuItem>
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
        <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-4">
          <div className="relative">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/60 backdrop-blur-sm p-4 rounded-lg border border-border/50 leading-relaxed">
              {prompt.content}
            </p>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        </div>
      )}
    </Card>
  );
}