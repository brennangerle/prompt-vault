'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  } from "@/components/ui/dropdown-menu"
import { Copy, Check, Wand2, Share2, MoreVertical, Trash2, Pencil } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { Badge } from './ui/badge';
import { EditPromptDialog } from './edit-prompt-dialog';

interface PromptCardProps {
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
}

export function PromptCard({ prompt, onUpdatePrompt, onDeletePrompt }: PromptCardProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.content);
    setIsCopied(true);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = () => {
    toast({
        title: 'Prompt Shared',
        description: 'Your prompt is ready to be shared with your team.',
    })
  }

  const handleUpdateContent = (newContent: string) => {
    onUpdatePrompt({ ...prompt, content: newContent });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
            <div className='flex-1'>
                <CardTitle>{prompt.title}</CardTitle>
            </div>
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
                    <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Share</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDeletePrompt(prompt.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="relative">
          <p className="whitespace-pre-wrap rounded-md border bg-muted/50 p-3 font-mono text-sm leading-relaxed">
            {prompt.content}
          </p>
           <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={handleCopy}
                    >
                    {isCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Copy Prompt</p>
                </TooltipContent>
            </Tooltip>
           </TooltipProvider>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
            {prompt.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
        </div>
        <OptimizePromptDialog promptContent={prompt.content} onApply={handleUpdateContent}>
            <Button variant="outline" className="w-full sm:w-auto gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Optimize Prompt
            </Button>
        </OptimizePromptDialog>
      </CardFooter>
    </Card>
  );
}
