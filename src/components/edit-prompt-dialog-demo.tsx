'use client';

import * as React from 'react';
import { EditPromptDialog } from './edit-prompt-dialog';
import { Button } from './ui/button';
import type { Prompt, Team } from '@/lib/types';

const mockPrompt: Prompt = {
  id: '1',
  title: 'Sample Marketing Prompt',
  content: 'Create a compelling marketing copy for a new product launch. Focus on benefits, target audience, and call-to-action. Make it engaging and persuasive.',
  tags: ['marketing', 'copywriting', 'product-launch'],
  software: 'Gemini',
  sharing: 'team',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  lastModified: '2024-01-02T00:00:00Z',
  modifiedBy: 'user1',
  usageCount: 15,
  lastUsed: '2024-01-03T00:00:00Z',
  assignedTeams: ['team1', 'team2'],
  metadata: {
    version: 3,
    changelog: [
      {
        timestamp: '2024-01-01T00:00:00Z',
        userId: 'user1',
        action: 'created',
        changes: {}
      },
      {
        timestamp: '2024-01-02T00:00:00Z',
        userId: 'user1',
        action: 'updated',
        changes: {
          title: { old: 'Old Title', new: 'Sample Marketing Prompt' }
        }
      }
    ]
  }
};

const mockTeams: Team[] = [
  {
    id: 'team1',
    name: 'Marketing Team',
    members: [
      { id: 'user1', email: 'user1@company.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' },
      { id: 'user2', email: 'user2@company.com', role: 'member', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'team2',
    name: 'Content Team',
    members: [
      { id: 'user3', email: 'user3@company.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    createdBy: 'user3',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const mockAvailableTags = [
  'marketing', 'copywriting', 'product-launch', 'social-media', 
  'email-marketing', 'content-creation', 'seo', 'advertising',
  'branding', 'customer-engagement'
];

export function EditPromptDialogDemo() {
  const [prompt, setPrompt] = React.useState<Prompt>(mockPrompt);

  const handleUpdatePrompt = (updatedPrompt: Prompt) => {
    setPrompt(updatedPrompt);
    console.log('Prompt updated:', updatedPrompt);
  };

  return (
    <div className="p-8 space-y-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Enhanced Edit Prompt Dialog Demo</h1>
        <p className="text-muted-foreground mb-6">
          This demo showcases the enhanced prompt editing dialog with new features including:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground mb-6">
          <li>Extended form validation for all fields</li>
          <li>Advanced tag management with suggestions</li>
          <li>Team assignment interface</li>
          <li>Live preview functionality</li>
          <li>Usage analytics display</li>
          <li>Tabbed interface for better organization</li>
        </ul>
        
        <div className="space-y-4">
          <EditPromptDialog
            prompt={prompt}
            onUpdatePrompt={handleUpdatePrompt}
            teams={mockTeams}
            availableTags={mockAvailableTags}
            currentUserId="user1"
          >
            <Button>Edit Prompt</Button>
          </EditPromptDialog>
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Current Prompt State:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(prompt, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}