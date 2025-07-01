'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generatePromptMetadata } from '@/ai/flows/generate-prompt-metadata';
import { Loader2, Wand2, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { OptimizePromptDialog } from './optimize-prompt-dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const promptFormSchema = z.object({
  content: z.string().min(20, 'Prompt content must be at least 20 characters.'),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

interface QuickPromptFormProps {
  onAddPrompt: (prompt: Omit<Prompt, 'id'>) => void;
}

export function QuickPromptForm({ onAddPrompt }: QuickPromptFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      content: '',
    },
  });

  const contentValue = form.watch('content');

  const handleOptimizedPromptApply = (optimizedContent: string) => {
    form.setValue('content', optimizedContent, { shouldValidate: true });
  };

  const onSubmit = async (data: PromptFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const metadata = await generatePromptMetadata({ prompt: data.content });
      onAddPrompt({
        content: data.content,
        title: metadata.title,
        tags: metadata.tags,
        sharing: 'private',
      });
      toast({
        title: 'Prompt Added',
        description: `"${metadata.title}" has been added to your repository.`,
      });
      form.reset();
    } catch (e) {
      setError('Failed to process prompt. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="w-full mb-4 sm:mb-6">
        <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="size-5" />
                Add New Prompt
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel className="sr-only">Prompt Content</FormLabel>
                    <FormControl>
                        <div className="relative">
                        <Textarea
                            placeholder="Paste your prompt here to add it to your repository. We'll use AI to automatically generate a title and tags."
                            className="min-h-[100px] font-mono pr-12"
                            {...field}
                        />
                        <div className="absolute bottom-2 right-2">
                            <OptimizePromptDialog
                            promptContent={contentValue}
                            onApply={handleOptimizedPromptApply}
                            >
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                disabled={!contentValue || contentValue.length < 20}
                            >
                                <Wand2 className="h-4 w-4" />
                                <span className="sr-only">Optimize Prompt</span>
                            </Button>
                            </OptimizePromptDialog>
                        </div>
                        </div>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                
                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading || form.formState.isSubmitting} className="w-full sm:w-auto">
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Prompt to Repository
                    </Button>
                </div>
            </form>
            </Form>
        </CardContent>
    </Card>
  );
}
