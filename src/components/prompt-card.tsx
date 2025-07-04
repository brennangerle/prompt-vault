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
import { Copy, Check, Wand2, MoreVertical, Trash2, Pencil, BrainCircuit, Globe } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { EditPromptDialog } from './edit-prompt-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PromptCardProps {
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
  isEditable: boolean;
}

export function PromptCard({ prompt, onUpdatePrompt, onDeletePrompt, isEditable }: PromptCardProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const { toast } = useToast();

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
    if (prompt.sharing !== 'global' && isEditable) {
      // When changing to team sharing, ensure teamId is set
      const updates: Partial<Prompt> = {
        sharing: isTeam ? 'team' : 'private'
      };
      
      // If changing to private, we can optionally clear teamId
      if (!isTeam && prompt.teamId) {
        updates.teamId = undefined;
      }
      
      onUpdatePrompt({ ...prompt, ...updates });
      
      // Show feedback to user
      toast({
        title: isTeam ? 'Copied to Team' : 'Moved to Private',
        description: isTeam ? 'Your prompt is now visible to your team.' : 'Your prompt is now private.',
      });
    }
  };

  const handleGlobalShare = () => {
    onUpdatePrompt({ ...prompt, sharing: 'global' });
    toast({
      title: 'Shared to Community',
      description: 'Your prompt is now visible to everyone.',
    });
  };

  return (
    <Card className="w-full group transition-all-smooth hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 border-0 glass-light">
      <div className="flex flex-col sm:flex-row sm:items-start p-6 gap-4">
        <div className="flex-1 space-y-4">
          <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{prompt.title}</CardTitle>
          <div className="relative">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted/60 backdrop-blur-sm p-4 rounded-lg border border-border/50 leading-relaxed">
              {prompt.content}
            </p>
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prompt.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="bg-secondary/80 hover:bg-secondary transition-colors duration-200 font-medium">
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
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {isEditable && prompt.sharing !== 'global' && (
            <div className="flex items-center space-x-3 bg-background/50 backdrop-blur-sm rounded-full px-3 py-2 border border-border/30">
              <Switch
                id={`sharing-switch-${prompt.id}`}
                checked={prompt.sharing === 'team'}
                onCheckedChange={handleSharingChange}
                aria-label="Copy to team repository"
              />
              <Label htmlFor={`sharing-switch-${prompt.id}`} className="text-xs text-muted-foreground whitespace-nowrap font-medium">
                {prompt.sharing === 'private' && 'Private'}
                {prompt.sharing === 'team' && 'Team'}
              </Label>
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 hover:glow-primary transition-all duration-300 border border-border/30"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Full Prompt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {isEditable && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-background/50 backdrop-blur-sm hover:bg-primary/10 transition-all duration-300 border border-border/30 shrink-0">
                  <MoreVertical className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
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
                {isEditable && (
                  <>
                    <DropdownMenuItem onClick={handleGlobalShare} disabled={prompt.sharing === 'global'}>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>Share to Community</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDeletePrompt(prompt.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </Card>
  );
}
