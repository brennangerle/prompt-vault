'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Upload, FileText, Users } from 'lucide-react';
import { PromptExportDialog } from './prompt-export-dialog';
import { PromptImportDialog } from './prompt-import-dialog';
import type { Team, Prompt, ImportResult } from '@/lib/types';

// Mock data for demonstration
const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Development Team',
    members: [
      { id: 'user-1', email: 'dev1@example.com', role: 'admin', joinedAt: '2024-01-01' },
      { id: 'user-2', email: 'dev2@example.com', role: 'member', joinedAt: '2024-01-02' }
    ],
    createdBy: 'user-1',
    createdAt: '2024-01-01'
  },
  {
    id: 'team-2',
    name: 'Marketing Team',
    members: [
      { id: 'user-3', email: 'marketing1@example.com', role: 'admin', joinedAt: '2024-01-01' },
      { id: 'user-4', email: 'marketing2@example.com', role: 'member', joinedAt: '2024-01-02' }
    ],
    createdBy: 'user-3',
    createdAt: '2024-01-01'
  }
];

const mockPrompts: Prompt[] = [
  {
    id: 'prompt-1',
    title: 'Code Review Assistant',
    content: 'Please review this code for best practices, security issues, and performance optimizations...',
    tags: ['code-review', 'development', 'quality'],
    sharing: 'team',
    createdBy: 'user-1',
    teamId: 'team-1',
    createdAt: '2024-01-01',
    lastModified: '2024-01-15',
    modifiedBy: 'user-1',
    usageCount: 25,
    lastUsed: '2024-01-20',
    assignedTeams: ['team-1']
  },
  {
    id: 'prompt-2',
    title: 'Marketing Copy Generator',
    content: 'Create compelling marketing copy for the following product...',
    tags: ['marketing', 'copywriting', 'content'],
    sharing: 'team',
    createdBy: 'user-3',
    teamId: 'team-2',
    createdAt: '2024-01-02',
    lastModified: '2024-01-16',
    modifiedBy: 'user-3',
    usageCount: 18,
    lastUsed: '2024-01-19',
    assignedTeams: ['team-2']
  },
  {
    id: 'prompt-3',
    title: 'General Writing Assistant',
    content: 'Help me improve the following text for clarity, grammar, and style...',
    tags: ['writing', 'editing', 'general'],
    sharing: 'global',
    createdBy: 'user-1',
    createdAt: '2024-01-03',
    lastModified: '2024-01-17',
    modifiedBy: 'user-1',
    usageCount: 42,
    lastUsed: '2024-01-21',
    assignedTeams: []
  }
];

export function PromptImportExportDemo() {
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

  const currentUserId = 'user-1'; // Mock current user

  const handlePromptSelect = (promptId: string, selected: boolean) => {
    setSelectedPrompts(prev => 
      selected 
        ? [...prev, promptId]
        : prev.filter(id => id !== promptId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedPrompts(selected ? mockPrompts.map(p => p.id) : []);
  };

  const handleImportComplete = (result: ImportResult) => {
    setImportResults(prev => [result, ...prev.slice(0, 4)]); // Keep last 5 results
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Import/Export Demo</h1>
        <p className="text-muted-foreground">
          Test the prompt import and export functionality with mock data
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button onClick={() => setShowExportDialog(true)} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Prompts
        </Button>
        <Button onClick={() => setShowImportDialog(true)} variant="outline" className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import Prompts
        </Button>
      </div>

      {/* Prompt Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Available Prompts
            </span>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedPrompts.length === mockPrompts.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">Select All ({selectedPrompts.length}/{mockPrompts.length})</span>
            </div>
          </CardTitle>
          <CardDescription>
            Select prompts to include in exports or view available prompts for testing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockPrompts.map((prompt) => (
              <div key={prompt.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                <Checkbox
                  checked={selectedPrompts.includes(prompt.id)}
                  onCheckedChange={(checked) => handlePromptSelect(prompt.id, checked as boolean)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{prompt.title}</h3>
                    <Badge variant={prompt.sharing === 'global' ? 'default' : prompt.sharing === 'team' ? 'secondary' : 'outline'}>
                      {prompt.sharing}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {prompt.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Usage: {prompt.usageCount}</span>
                    <span>Tags: {prompt.tags?.length || 0}</span>
                    {prompt.teamId && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {mockTeams.find(t => t.id === prompt.teamId)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Teams Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Teams
          </CardTitle>
          <CardDescription>
            Teams available for import/export operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockTeams.map((team) => (
              <div key={team.id} className="p-3 border rounded-lg">
                <h3 className="font-medium mb-1">{team.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {team.members.length} members
                </p>
                <div className="text-xs text-muted-foreground">
                  Prompts: {mockPrompts.filter(p => p.teamId === team.id || p.assignedTeams?.includes(team.id)).length}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Results */}
      {importResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Import Results</CardTitle>
            <CardDescription>
              Results from recent import operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importResults.map((result, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={result.success ? 'default' : 'destructive'}>
                      {result.success ? 'Success' : 'Partial Success'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Import #{importResults.length - index}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-green-600">{result.imported}</div>
                      <div className="text-muted-foreground">Imported</div>
                    </div>
                    <div>
                      <div className="font-medium text-yellow-600">{result.skipped}</div>
                      <div className="text-muted-foreground">Skipped</div>
                    </div>
                    <div>
                      <div className="font-medium text-red-600">{result.errors.length}</div>
                      <div className="text-muted-foreground">Errors</div>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      First error: {result.errors[0].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <PromptExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        teams={mockTeams}
        prompts={mockPrompts}
        selectedPrompts={selectedPrompts}
        currentUserId={currentUserId}
      />

      <PromptImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        teams={mockTeams}
        currentUserId={currentUserId}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}