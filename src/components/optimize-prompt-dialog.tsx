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
      <DialogContent className="w-full sm:max-w-4xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Optimize Prompt</DialogTitle>
          <DialogDescription className="text-sm">
            Our AI will analyze your prompt and suggest improvements.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <Skeleton className="h-6 sm:h-8 w-1/3" />
            <Skeleton className="h-20 sm:h-24 w-full" />
            <Skeleton className="h-6 sm:h-8 w-1/4" />
            <div className="space-y-2">
              <Skeleton className="h-5 sm:h-6 w-full" />
              <Skeleton className="h-5 sm:h-6 w-5/6" />
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
          <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Optimized Prompt</h3>
              <div className="max-h-60 sm:max-h-96 overflow-y-auto rounded-md border bg-muted p-3 sm:p-4">
                <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm font-mono leading-relaxed">
                  {result.optimizedPrompt}
                </pre>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Suggestions</h3>
              <div className="max-h-36 sm:max-h-48 overflow-y-auto">
                <ul className="list-inside list-disc space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index} className="leading-relaxed">{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          {result && (
            <Button onClick={handleApply} className="w-full sm:w-auto gap-2 h-11 sm:h-10">
              <ThumbsUp className="h-4 w-4" /> Apply Optimization
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
