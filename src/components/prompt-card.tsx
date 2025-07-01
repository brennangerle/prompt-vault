'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Copy, Check, Wand2, Share2, MoreVertical, Trash2 } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';


interface PromptCardProps {
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
}

export function PromptCard({ prompt, onUpdatePrompt, onDeletePrompt }: PromptCardProps) {
  const [content, setContent] = React.useState(prompt.content);
  const [isCopied, setIsCopied] = React.useState(false);
  const [isOptimizeOpen, setIsOptimizeOpen] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
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
    setContent(newContent);
    onUpdatePrompt({ ...prompt, content: newContent });
  };

  const handleBlur = () => {
    if(content !== prompt.content) {
        onUpdatePrompt({ ...prompt, content });
        toast({
            title: "Prompt Updated",
            description: `"${prompt.title}" has been saved.`
        })
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
            <div>
                <CardTitle>{prompt.title}</CardTitle>
                <CardDescription className="pt-1">{prompt.description}</CardDescription>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            className="min-h-[150px] font-mono text-sm leading-relaxed pr-10"
            aria-label="Prompt content"
          />
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
      <CardFooter className="flex-col items-start gap-4">
        <Badge variant="secondary">{prompt.category}</Badge>
        <OptimizePromptDialog promptContent={content} onApply={handleUpdateContent}>
            <Button variant="outline" className="w-full gap-2">
                <Wand2 className="h-4 w-4 text-primary" />
                Optimize Prompt
            </Button>
        </OptimizePromptDialog>
      </CardFooter>
    </Card>
  );
}
