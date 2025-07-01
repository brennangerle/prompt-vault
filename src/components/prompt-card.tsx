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
import { Copy, Check, Wand2, Share2, MoreVertical, Trash2, Pencil, BrainCircuit } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { EditPromptDialog } from './edit-prompt-dialog';

interface PromptCardProps {
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
}

export function PromptCard({ prompt, onUpdatePrompt, onDeletePrompt }: PromptCardProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setIsCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = () => {
    toast({
      title: 'Prompt Shared',
      description: 'Your prompt is ready to be shared with your team.',
    });
  };

  const handleUpdateContent = (newContent: string) => {
    onUpdatePrompt({ ...prompt, content: newContent });
  };

  return (
    <Card className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start p-4 gap-4">
        <div className="flex-1 space-y-3">
          <CardTitle className="text-lg">{prompt.title}</CardTitle>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-muted p-3 rounded-md">
            {prompt.content}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {prompt.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
            {prompt.software && (
              <Badge variant="outline" className="gap-1.5 pl-2">
                <BrainCircuit className="h-3.5 w-3.5" />
                {prompt.software}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopy}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy Full Prompt</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
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
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDeletePrompt(prompt.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
