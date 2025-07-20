'use client';

import * as React from 'react';
import { optimizePrompt, type OptimizePromptOutput } from '@/ai/flows/optimize-prompt';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OptimizePromptDialogProps {
  children: React.ReactNode;
  promptContent: string;
  onApply: (optimizedContent: string) => void;
}

export function OptimizePromptDialog({
  children,
  promptContent,
  onApply,
}: OptimizePromptDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<OptimizePromptOutput | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      const runOptimization = async () => {
        setIsLoading(true);
        setResult(null);
        setError(null);
        try {
          const res = await optimizePrompt({ prompt: promptContent });
          setResult(res);
        } catch (e) {
          setError('Failed to optimize prompt. Please try again.');
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      runOptimization();
    }
  }, [open, promptContent]);

  const handleApply = () => {
    if (result) {
      onApply(result.optimizedPrompt);
      toast({
        title: 'Optimization Applied!',
        description: 'The prompt has been updated with the optimized version.',
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Optimize Prompt</DialogTitle>
          <DialogDescription>
            Our AI will analyze your prompt and suggest improvements.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-8 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
            </div>
          </div>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {result && (
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold text-foreground">Optimized Prompt</h3>
              <p className="mt-2 rounded-md border bg-muted p-4 font-mono text-sm">
                {result.optimizedPrompt}
              </p>
            </div>
            
          </div>
        )}

        <DialogFooter>
          {result && (
            <Button onClick={handleApply} className="gap-2">
              <ThumbsUp className="h-4 w-4" /> Apply Optimization
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
