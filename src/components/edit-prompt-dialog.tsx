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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Prompt } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const promptFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(20, 'Prompt content must be at least 20 characters.'),
  tags: z.string().optional(),
  software: z.string().optional(),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

const softwareOptions = ['None', 'Gemini', 'ChatGPT', 'Claude', 'Midjourney', 'DALL-E', 'Other'];

interface EditPromptDialogProps {
  children: React.ReactNode;
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
}

export function EditPromptDialog({ children, prompt, onUpdatePrompt }: EditPromptDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      title: prompt.title,
      content: prompt.content,
      tags: prompt.tags.join(', '),
      software: prompt.software || 'None',
    },
  });

  const onSubmit = (data: PromptFormValues) => {
    const newTags = data.tags?.split(',').map(tag => tag.trim()).filter(Boolean) || [];
    const newSoftware = data.software === 'None' ? undefined : data.software;

    onUpdatePrompt({ 
        ...prompt, 
        title: data.title,
        content: data.content,
        tags: newTags,
        software: newSoftware
    });
    toast({
      title: 'Prompt Updated',
      description: `"${data.title}" has been saved.`,
    });
    setOpen(false);
  };
  
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: prompt.title,
        content: prompt.content,
        tags: prompt.tags.join(', '),
        software: prompt.software || 'None',
      });
    }
  }, [open, prompt, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>
            Make changes to your prompt below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the full prompt text here..."
                      className="min-h-[120px] font-mono"
                      {...field}
                    />
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
                    <Input placeholder="e.g., marketing, ad copy, social media" {...field} />
                  </FormControl>
                  <FormDescription>
                    Separate tags with commas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="software"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Software / LLM</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a software..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {softwareOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
