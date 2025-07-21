'use client';

import { PromptAnalyticsDemo } from '@/components/prompt-analytics-demo';

export default function PromptAnalyticsTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prompt Analytics Test</h1>
        <p className="text-muted-foreground">
          Test and demonstration page for the prompt usage analytics and tracking system.
        </p>
      </div>
      
      <PromptAnalyticsDemo />
    </div>
  );
}