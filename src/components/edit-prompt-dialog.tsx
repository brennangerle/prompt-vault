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

const promptFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  content: z.string().min(20, 'Prompt content must be at least 20 characters.'),
  tags: z.array(z.string()).min(1, 'Please add at least one tag.'),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

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
      tags: prompt.tags,
    },
  });

  const onSubmit = (data: PromptFormValues) => {
    onUpdatePrompt({ ...prompt, ...data });
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
        tags: prompt.tags,
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
            
            <DialogFooter>
                <Button type="submit" disabled={form.formState.isSubmitting}>Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
