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
import { Copy, Check, Wand2, Share2, MoreVertical, Trash2, Pencil } from 'lucide-react';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { EditPromptDialog } from './edit-prompt-dialog';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';

const softwareOptions = ['Gemini', 'ChatGPT', 'Claude', 'Midjourney', 'DALL-E', 'Other'];

interface PromptCardProps {
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (id: string) => void;
}

export function PromptCard({ prompt, onUpdatePrompt, onDeletePrompt }: PromptCardProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const [tagsInput, setTagsInput] = React.useState(prompt.tags.join(', '));
  const { toast } = useToast();

  React.useEffect(() => {
    setTagsInput(prompt.tags.join(', '));
  }, [prompt.tags]);

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

  const handleTagsBlur = () => {
    const newTags = tagsInput.split(',').map(tag => tag.trim()).filter(Boolean);
    if (JSON.stringify(newTags) !== JSON.stringify(prompt.tags)) {
      onUpdatePrompt({ ...prompt, tags: newTags });
    }
  };

  const handleSoftwareChange = (newSoftware: string) => {
    onUpdatePrompt({ ...prompt, software: newSoftware === 'None' ? undefined : newSoftware });
  };
  
  const truncatedContent =
    prompt.content.length > 100
      ? `${prompt.content.substring(0, 100)}...`
      : prompt.content;

  return (
    <Card className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-start p-4 gap-4">
        <div className="flex-1 space-y-4">
          <CardTitle className="text-lg">{prompt.title}</CardTitle>
          <p className="text-sm text-muted-foreground hidden md:block">
            {truncatedContent}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor={`tags-${prompt.id}`} className="text-xs text-muted-foreground">
                Tags
              </Label>
              <Input
                id={`tags-${prompt.id}`}
                placeholder="e.g., Marketing, Ad Copy"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onBlur={handleTagsBlur}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor={`software-${prompt.id}`} className="text-xs text-muted-foreground">
                Software / LLM
              </Label>
              <Select
                value={prompt.software || ''}
                onValueChange={handleSoftwareChange}
              >
                <SelectTrigger id={`software-${prompt.id}`} className="h-9">
                  <SelectValue placeholder="Select software..." />
                </SelectTrigger>
                <SelectContent>
                  {softwareOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <OptimizePromptDialog
            promptContent={prompt.content}
            onApply={handleUpdateContent}
          >
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4 text-primary" />
              Optimize
            </Button>
          </OptimizePromptDialog>

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
                  <span>Edit Title/Content</span>
                </DropdownMenuItem>
              </EditPromptDialog>
              <DropdownMenuItem
                className="flex items-center sm:hidden p-0"
                onSelect={(e) => e.preventDefault()}
              >
                <OptimizePromptDialog
                  promptContent={prompt.content}
                  onApply={handleUpdateContent}
                >
                  <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                    <Wand2 className="mr-2 h-4 w-4" />
                    <span>Optimize</span>
                  </div>
                </OptimizePromptDialog>
              </DropdownMenuItem>
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