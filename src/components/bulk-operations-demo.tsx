'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PromptTable } from './prompt-table';
import { BulkOperation, BulkOperationResult } from './bulk-operations-toolbar';
import { executeBulkOperation } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { Prompt, Team } from '@/lib/types';
import type { PromptFilters, SortConfig } from './prompt-table';

// Mock data for demonstration
const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: 'Code Review Assistant',
    content: 'You are a senior software engineer reviewing code. Please analyze the following code for potential issues, best practices, and improvements.',
    tags: ['code-review', 'development', 'quality'],
    sharing: 'team',
    createdBy: 'user1',
    teamId: 'team1',
    createdAt: '2024-01-15T10:00:00Z',
    lastModified: '2024-01-20T14:30:00Z',
    modifiedBy: 'user1',
    usageCount: 25,
    lastUsed: '2024-01-25T09:15:00Z',
    assignedTeams: ['team1', 'team2']
  },
  {
    id: '2',
    title: 'Documentation Writer',
    content: 'Help me write clear and comprehensive documentation for the following feature or API.',
    tags: ['documentation', 'writing', 'technical'],
    sharing: 'global',
    createdBy: 'user2',
    createdAt: '2024-01-10T08:00:00Z',
    lastModified: '2024-01-18T16:45:00Z',
    modifiedBy: 'user2',
    usageCount: 42,
    lastUsed: '2024-01-24T11:20:00Z',
    assignedTeams: ['team1']
  },
  {
    id: '3',
    title: 'Bug Report Analyzer',
    content: 'Analyze this bug report and suggest potential root causes and debugging steps.',
    tags: ['debugging', 'analysis', 'troubleshooting'],
    sharing: 'team',
    createdBy: 'user1',
    teamId: 'team2',
    createdAt: '2024-01-12T12:00:00Z',
    lastModified: '2024-01-22T10:15:00Z',
    modifiedBy: 'user3',
    usageCount: 18,
    lastUsed: '2024-01-23T15:30:00Z',
    assignedTeams: ['team2']
  },
  {
    id: '4',
    title: 'Meeting Summary Generator',
    content: 'Create a concise summary of the following meeting notes, highlighting key decisions and action items.',
    tags: ['meetings', 'summary', 'productivity'],
    sharing: 'private',
    createdBy: 'user3',
    createdAt: '2024-01-08T14:00:00Z',
    lastModified: '2024-01-16T09:30:00Z',
    modifiedBy: 'user3',
    usageCount: 7,
    lastUsed: '2024-01-20T13:45:00Z',
    assignedTeams: []
  },
  {
    id: '5',
    title: 'API Design Reviewer',
    content: 'Review this API design for RESTful principles, security considerations, and usability.',
    tags: ['api', 'design', 'review', 'rest'],
    sharing: 'global',
    createdBy: 'user2',
    createdAt: '2024-01-05T16:00:00Z',
    lastModified: '2024-01-19T11:20:00Z',
    modifiedBy: 'user2',
    usageCount: 33,
    lastUsed: '2024-01-25T08:10:00Z',
    assignedTeams: ['team1', 'team3']
  }
];

const mockTeams: Team[] = [
  {
    id: 'team1',
    name: 'Frontend Team',
    members: [
      { id: 'user1', email: 'user1@example.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' },
      { id: 'user2', email: 'user2@example.com', role: 'member', joinedAt: '2024-01-02T00:00:00Z' }
    ],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'team2',
    name: 'Backend Team',
    members: [
      { id: 'user3', email: 'user3@example.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' },
      { id: 'user1', email: 'user1@example.com', role: 'member', joinedAt: '2024-01-03T00:00:00Z' }
    ],
    createdBy: 'user3',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'team3',
    name: 'DevOps Team',
    members: [
      { id: 'user4', email: 'user4@example.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    createdBy: 'user4',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

export function BulkOperationsDemo() {
  const [prompts, setPrompts] = useState<Prompt[]>(mockPrompts);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [filters, setFilters] = useState<PromptFilters>({
    search: '',
    tags: [],
    sharing: [],
    dateRange: null,
    createdBy: null,
    hasUsage: null
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'lastModified',
    direction: 'desc'
  });
  const [operationResults, setOperationResults] = useState<BulkOperationResult[]>([]);

  const availableTags = Array.from(
    new Set(prompts.flatMap(p => p.tags || []))
  ).sort();

  const availableUsers = Array.from(
    new Set(prompts.map(p => p.createdBy).filter(Boolean) as string[])
  ).sort();

  const handlePromptSelect = (promptId: string, selected: boolean) => {
    if (selected) {
      setSelectedPrompts(prev => [...prev, promptId]);
    } else {
      setSelectedPrompts(prev => prev.filter(id => id !== promptId));
    }
  };

  const handlePromptSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPrompts(prompts.map(p => p.id));
    } else {
      setSelectedPrompts([]);
    }
  };

  const handleSort = (field: keyof Prompt | 'usageCount' | 'lastUsed') => {
    setSortConfig((prev: SortConfig) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleBulkOperation = async (
    operation: BulkOperation, 
    promptIds: string[]
  ): Promise<BulkOperationResult> => {
    // Simulate the bulk operation with mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        const result: BulkOperationResult = {
          successful: [],
          failed: [],
          operation
        };

        // Simulate processing each prompt
        promptIds.forEach((promptId, index) => {
          // Simulate some failures for demonstration
          if (Math.random() > 0.8) {
            result.failed.push({
              promptId,
              error: `Simulated error for prompt ${promptId}`
            });
          } else {
            result.successful.push(promptId);
            
            // Apply the operation to mock data
            setPrompts(prev => prev.map(prompt => {
              if (prompt.id === promptId) {
                switch (operation.type) {
                  case 'delete':
                    return null; // Will be filtered out
                  case 'add-tags':
                    if (operation.data && Array.isArray(operation.data)) {
                      const newTags = [...(prompt.tags || []), ...operation.data];
                      return { ...prompt, tags: Array.from(new Set(newTags)) };
                    }
                    break;
                  case 'remove-tags':
                    if (operation.data && Array.isArray(operation.data)) {
                      const tagsToRemove = operation.data.map((t: string) => t.toLowerCase());
                      const filteredTags = (prompt.tags || []).filter(
                        tag => !tagsToRemove.includes(tag.toLowerCase())
                      );
                      return { ...prompt, tags: filteredTags };
                    }
                    break;
                  case 'assign-team':
                    if (operation.data) {
                      const assignedTeams = prompt.assignedTeams || [];
                      if (!assignedTeams.includes(operation.data)) {
                        return { 
                          ...prompt, 
                          assignedTeams: [...assignedTeams, operation.data] 
                        };
                      }
                    }
                    break;
                  case 'unassign-team':
                    if (operation.data) {
                      const assignedTeams = (prompt.assignedTeams || []).filter(
                        teamId => teamId !== operation.data
                      );
                      return { ...prompt, assignedTeams };
                    }
                    break;
                }
              }
              return prompt;
            }).filter(Boolean) as Prompt[]);
          }
        });

        setOperationResults(prev => [...prev, result]);
        resolve(result);
      }, 2000); // Simulate 2 second operation
    });
  };

  const resetDemo = () => {
    setPrompts(mockPrompts);
    setSelectedPrompts([]);
    setOperationResults([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Operations Demo</CardTitle>
          <CardDescription>
            This demo shows the bulk operations interface for prompt management. 
            Select multiple prompts and use the bulk operations toolbar to perform actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {prompts.length} total prompts
              </Badge>
              {selectedPrompts.length > 0 && (
                <Badge variant="secondary">
                  {selectedPrompts.length} selected
                </Badge>
              )}
            </div>
            <Button variant="outline" onClick={resetDemo}>
              Reset Demo
            </Button>
          </div>

          <PromptTable
            prompts={prompts}
            selectedPrompts={selectedPrompts}
            onPromptSelect={handlePromptSelect}
            onPromptSelectAll={handlePromptSelectAll}
            onPromptEdit={() => {}}
            onPromptDelete={() => {}}
            onPromptView={() => {}}
            onBulkOperation={handleBulkOperation}
            sortConfig={sortConfig}
            onSort={handleSort}
            filters={filters}
            onFiltersChange={setFilters}
            availableTags={availableTags}
            availableUsers={availableUsers}
            teams={mockTeams}
            isLoading={false}
          />
        </CardContent>
      </Card>

      {/* Operation Results */}
      {operationResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Operation Results</CardTitle>
            <CardDescription>
              Results from bulk operations performed in this demo session.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {operationResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {result.operation.type.replace('-', ' ').toUpperCase()}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Operation #{index + 1}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-green-600">
                        Successful: {result.successful.length}
                      </div>
                      {result.successful.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.successful.slice(0, 3).join(', ')}
                          {result.successful.length > 3 && ` +${result.successful.length - 3} more`}
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="font-medium text-red-600">
                        Failed: {result.failed.length}
                      </div>
                      {result.failed.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.failed.slice(0, 2).map(f => f.error).join(', ')}
                          {result.failed.length > 2 && ` +${result.failed.length - 2} more`}
                        </div>
                      )}
                    </div>
                  </div>

                  {result.operation.data && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <strong>Data:</strong> {JSON.stringify(result.operation.data)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}