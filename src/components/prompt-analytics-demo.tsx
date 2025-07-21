'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Eye, 
  Copy, 
  Zap, 
  TrendingUp, 
  RefreshCw,
  Play,
  Users
} from 'lucide-react';
import { PromptAnalytics } from './prompt-analytics';
import { AnalyticsDashboard } from './analytics-dashboard';
import { usageTracker } from '@/lib/usage-tracker';
import { getAllPrompts } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Prompt } from '@/lib/types';

export function PromptAnalyticsDemo() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [demoRunning, setDemoRunning] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const promptsData = await getAllPrompts();
      setPrompts(promptsData);
      if (promptsData.length > 0 && !selectedPromptId) {
        setSelectedPromptId(promptsData[0].id);
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoUsage = async () => {
    if (!selectedPromptId || demoRunning) return;
    
    setDemoRunning(true);
    
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        alert('Please log in to generate demo usage data');
        return;
      }

      const actions: Array<'viewed' | 'copied' | 'used' | 'optimized'> = [
        'viewed', 'copied', 'used', 'optimized'
      ];

      // Generate 20 random usage events over the past few days
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        // Add some delay between tracking calls to simulate real usage
        promises.push(
          new Promise(resolve => {
            setTimeout(async () => {
              await usageTracker.track(selectedPromptId, action, { immediate: true });
              resolve(void 0);
            }, i * 100);
          })
        );
      }

      await Promise.all(promises);
      
      // Wait a bit for the data to be processed
      setTimeout(() => {
        setDemoRunning(false);
        // Force refresh of analytics components
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error generating demo usage:', error);
      setDemoRunning(false);
    }
  };

  const trackDemoAction = async (action: 'viewed' | 'copied' | 'used' | 'optimized') => {
    if (!selectedPromptId) return;
    
    try {
      await usageTracker.track(selectedPromptId, action, { immediate: true });
      // Small delay to allow data to be processed
      setTimeout(() => {
        // You might want to trigger a refresh of the analytics component here
      }, 1000);
    } catch (error) {
      console.error('Error tracking demo action:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prompt Analytics Demo</CardTitle>
          <CardDescription>Loading demo data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Prompt Analytics Demo
          </CardTitle>
          <CardDescription>
            Demonstration of usage analytics and tracking functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <Select value={selectedPromptId} onValueChange={setSelectedPromptId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a prompt to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {prompts.map(prompt => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      {prompt.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={generateDemoUsage} 
              disabled={!selectedPromptId || demoRunning}
              className="flex items-center gap-2"
            >
              {demoRunning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Generate Demo Usage
            </Button>
          </div>

          {selectedPromptId && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => trackDemoAction('viewed')}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Track View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => trackDemoAction('copied')}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Track Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => trackDemoAction('used')}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Track Use
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => trackDemoAction('optimized')}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Track Optimize
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Selected Prompt:</strong> {prompts.find(p => p.id === selectedPromptId)?.title}
                </p>
                <p>
                  <strong>Sharing:</strong> <Badge variant="secondary">
                    {prompts.find(p => p.id === selectedPromptId)?.sharing}
                  </Badge>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="individual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual">Individual Prompt Analytics</TabsTrigger>
          <TabsTrigger value="dashboard">Analytics Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          {selectedPromptId ? (
            <PromptAnalytics promptId={selectedPromptId} />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Prompt</h3>
                <p className="text-muted-foreground">
                  Choose a prompt from the dropdown above to view its analytics
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usage Tracking Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Tracked Actions</h4>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <span><strong>Viewed:</strong> When a prompt is displayed or opened</span>
                </li>
                <li className="flex items-center gap-2">
                  <Copy className="h-4 w-4 text-green-500" />
                  <span><strong>Copied:</strong> When prompt content is copied to clipboard</span>
                </li>
                <li className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-purple-500" />
                  <span><strong>Used:</strong> When a prompt is actively used in AI interactions</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span><strong>Optimized:</strong> When a prompt is processed through optimization</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Analytics Features</h4>
              <ul className="space-y-1 text-sm">
                <li>• Real-time usage statistics</li>
                <li>• Team and user breakdown</li>
                <li>• Usage trends over time</li>
                <li>• Activity logs and history</li>
                <li>• Filtering by date range and team</li>
                <li>• Export capabilities for reporting</li>
              </ul>
            </div>
          </div>
          
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Usage tracking is automatically enabled and batches events for optimal performance. 
              Data is processed in real-time and available immediately in the analytics dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}