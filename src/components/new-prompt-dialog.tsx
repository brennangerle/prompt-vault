'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generatePromptMetadata } from '@/ai/flows/generate-prompt-metadata';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const promptFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(20, 'Prompt content must be at least 20 characters.'),
  tags: z.array(z.string()).min(1, 'Please add at least one tag.'),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

interface NewPromptDialogProps {
  children: React.ReactNode;
  onAddPrompt: (prompt: Omit<Prompt, 'id'>) => void;
}

export function NewPromptDialog({ children, onAddPrompt }: NewPromptDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isGenerated, setIsGenerated] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      title: '',
      content: '',
      tags: [],
    },
  });

  const handleGenerate = async () => {
    const content = form.getValues('content');
    if (content.length < 20) {
      form.setError('content', {
        type: 'manual',
        message: 'Please enter at least 20 characters to generate details.',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePromptMetadata({ prompt: content });
      form.setValue('title', result.title, { shouldValidate: true });
      form.setValue('tags', result.tags, { shouldValidate: true });
      setIsGenerated(true);
    } catch (e) {
      setError('Failed to generate prompt details. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  const onSubmit = (data: PromptFormValues) => {
    onAddPrompt(data);
    toast({
      title: 'Prompt Added',
      description: `"${data.title}" has been added to your vault.`,
    });
    form.reset();
    setIsGenerated(false);
    setOpen(false);
  };
  
  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      form.reset();
      setIsLoading(false);
      setError(null);
      setIsGenerated(false);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Add New Prompt</DialogTitle>
          <DialogDescription>
            Paste your prompt below. We'll use AI to automatically generate a title and tags for you.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the full prompt text here... for example: 'Create a functional React component for a button...'"
                      className="min-h-[120px] font-mono"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!isGenerated && (
              <Button type="button" onClick={handleGenerate} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Details
              </Button>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isGenerated && (
              <div className="space-y-4 rounded-md border bg-muted/50 p-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Generate Marketing Copy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Marketing, Ad Copy" 
                          value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                          onChange={(e) => {
                            const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                            field.onChange(tags);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter>
                {isGenerated && <Button type="submit" disabled={form.formState.isSubmitting}>Add Prompt</Button>}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
