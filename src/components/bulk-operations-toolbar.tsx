'use client';

import * as React from 'react';
import { useState } from 'react';
import { 
  Trash2, 
  Tag as TagIcon, 
  Users, 
  X, 
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TagManager } from './tag-manager';
import { TeamPromptSelector } from './team-prompt-selector';
import type { Prompt, Team } from '@/lib/types';

export interface BulkOperation {
  type: 'delete' | 'add-tags' | 'remove-tags' | 'assign-team' | 'unassign-team';
  data?: any;
}

export interface BulkOperationResult {
  successful: string[];
  failed: { promptId: string; error: string }[];
  operation: BulkOperation;
}

export interface BulkOperationProgress {
  total: number;
  completed: number;
  current?: string;
  status: 'idle' | 'running' | 'completed' | 'error';
}

export interface BulkOperationsToolbarProps {
  selectedPrompts: string[];
  prompts: Prompt[];
  teams: Team[];
  availableTags: string[];
  onBulkOperation: (operation: BulkOperation, promptIds: string[]) => Promise<BulkOperationResult>;
  onClearSelection: () => void;
  disabled?: boolean;
}

export function BulkOperationsToolbar({
  selectedPrompts,
  prompts,
  teams,
  availableTags,
  onBulkOperation,
  onClearSelection,
  disabled = false
}: BulkOperationsToolbarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [operationData, setOperationData] = useState<any>(null);
  const [progress, setProgress] = useState<BulkOperationProgress>({
    total: 0,
    completed: 0,
    status: 'idle'
  });
  const [result, setResult] = useState<BulkOperationResult | null>(null);

  const selectedPromptObjects = prompts.filter(p => selectedPrompts.includes(p.id));

  const handleOperationClick = (operation: BulkOperation) => {
    setCurrentOperation(operation);
    setOperationData(null);
    setResult(null);
    setProgress({ total: 0, completed: 0, status: 'idle' });
    setIsDialogOpen(true);
  };

  const executeOperation = async () => {
    if (!currentOperation) return;

    setProgress({
      total: selectedPrompts.length,
      completed: 0,
      status: 'running'
    });

    try {
      const operation: BulkOperation = {
        ...currentOperation,
        data: operationData
      };

      const result = await onBulkOperation(operation, selectedPrompts);
      
      setResult(result);
      setProgress(prev => ({
        ...prev,
        completed: prev.total,
        status: 'completed'
      }));

      // Clear selection if operation was successful
      if (result.successful.length > 0) {
        setTimeout(() => {
          onClearSelection();
        }, 2000);
      }
    } catch (error) {
      setProgress(prev => ({
        ...prev,
        status: 'error'
      }));
      console.error('Bulk operation failed:', error);
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setCurrentOperation(null);
    setOperationData(null);
    setResult(null);
    setProgress({ total: 0, completed: 0, status: 'idle' });
  };

  const getOperationTitle = () => {
    switch (currentOperation?.type) {
      case 'delete':
        return 'Delete Prompts';
      case 'add-tags':
        return 'Add Tags';
      case 'remove-tags':
        return 'Remove Tags';
      case 'assign-team':
        return 'Assign to Team';
      case 'unassign-team':
        return 'Unassign from Team';
      default:
        return 'Bulk Operation';
    }
  };

  const getOperationDescription = () => {
    const count = selectedPrompts.length;
    switch (currentOperation?.type) {
      case 'delete':
        return `Are you sure you want to delete ${count} selected prompt${count > 1 ? 's' : ''}? This action cannot be undone.`;
      case 'add-tags':
        return `Add tags to ${count} selected prompt${count > 1 ? 's' : ''}.`;
      case 'remove-tags':
        return `Remove tags from ${count} selected prompt${count > 1 ? 's' : ''}.`;
      case 'assign-team':
        return `Assign ${count} selected prompt${count > 1 ? 's' : ''} to a team.`;
      case 'unassign-team':
        return `Unassign ${count} selected prompt${count > 1 ? 's' : ''} from a team.`;
      default:
        return '';
    }
  };

  const canExecute = () => {
    switch (currentOperation?.type) {
      case 'delete':
        return true;
      case 'add-tags':
      case 'remove-tags':
        return operationData && operationData.length > 0;
      case 'assign-team':
      case 'unassign-team':
        return operationData;
      default:
        return false;
    }
  };

  const renderOperationContent = () => {
    switch (currentOperation?.type) {
      case 'delete':
        return (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will permanently delete the selected prompts and cannot be undone.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <h4 className="font-medium">Prompts to be deleted:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedPromptObjects.map(prompt => (
                  <div key={prompt.id} className="text-sm p-2 bg-muted rounded">
                    {prompt.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'add-tags':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tags to add:</label>
              <TagManager
                tags={operationData || []}
                availableTags={availableTags}
                onTagsChange={setOperationData}
                placeholder="Select or create tags to add..."
                maxTags={10}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              These tags will be added to all {selectedPrompts.length} selected prompts.
            </div>
          </div>
        );

      case 'remove-tags':
        // Get all tags from selected prompts
        const allTagsFromSelected = Array.from(
          new Set(
            selectedPromptObjects.flatMap(p => p.tags || [])
          )
        );
        
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tags to remove:</label>
              <TagManager
                tags={operationData || []}
                availableTags={allTagsFromSelected}
                onTagsChange={setOperationData}
                placeholder="Select tags to remove..."
                allowCustomTags={false}
                maxTags={10}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              These tags will be removed from all selected prompts that have them.
            </div>
          </div>
        );

      case 'assign-team':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select team:</label>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {operationData ? 
                        teams.find(t => t.id === operationData)?.name || 'Unknown Team' : 
                        'Select a team...'
                      }
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuLabel>Available Teams</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {teams.map(team => (
                      <DropdownMenuItem
                        key={team.id}
                        onClick={() => setOperationData(team.id)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {team.name}
                        <Badge variant="outline" className="ml-auto">
                          {team.members.length} members
                        </Badge>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              All {selectedPrompts.length} selected prompts will be assigned to this team.
            </div>
          </div>
        );

      case 'unassign-team':
        // Get teams that have assignments for selected prompts
        const assignedTeams = Array.from(
          new Set(
            selectedPromptObjects.flatMap(p => p.assignedTeams || [])
          )
        ).map(teamId => teams.find(t => t.id === teamId)).filter(Boolean);

        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select team to unassign from:</label>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {operationData ? 
                        teams.find(t => t.id === operationData)?.name || 'Unknown Team' : 
                        'Select a team...'
                      }
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuLabel>Assigned Teams</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {assignedTeams.map(team => (
                      <DropdownMenuItem
                        key={team!.id}
                        onClick={() => setOperationData(team!.id)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        {team!.name}
                      </DropdownMenuItem>
                    ))}
                    {assignedTeams.length === 0 && (
                      <DropdownMenuItem disabled>
                        No teams assigned to selected prompts
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Selected prompts will be unassigned from this team.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (selectedPrompts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedPrompts.length} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {/* Delete Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleOperationClick({ type: 'delete' })}
            disabled={disabled}
            className="flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>

          {/* Tag Operations */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                <TagIcon className="h-3 w-3 mr-1" />
                Tags
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => handleOperationClick({ type: 'add-tags' })}
              >
                Add Tags
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOperationClick({ type: 'remove-tags' })}
              >
                Remove Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Team Operations */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={disabled}>
                <Users className="h-3 w-3 mr-1" />
                Teams
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => handleOperationClick({ type: 'assign-team' })}
              >
                Assign to Team
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOperationClick({ type: 'unassign-team' })}
              >
                Unassign from Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Operation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{getOperationTitle()}</DialogTitle>
            <DialogDescription>
              {getOperationDescription()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Indicator */}
            {progress.status === 'running' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress.completed} / {progress.total}</span>
                </div>
                <Progress 
                  value={(progress.completed / progress.total) * 100} 
                  className="w-full"
                />
                {progress.current && (
                  <div className="text-xs text-muted-foreground">
                    Current: {progress.current}
                  </div>
                )}
              </div>
            )}

            {/* Operation Results */}
            {result && progress.status === 'completed' && (
              <div className="space-y-2">
                {result.successful.length > 0 && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Successfully processed {result.successful.length} prompt{result.successful.length > 1 ? 's' : ''}.
                    </AlertDescription>
                  </Alert>
                )}
                {result.failed.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to process {result.failed.length} prompt{result.failed.length > 1 ? 's' : ''}:
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {result.failed.slice(0, 3).map((failure, index) => (
                          <li key={index}>{failure.error}</li>
                        ))}
                        {result.failed.length > 3 && (
                          <li>... and {result.failed.length - 3} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Operation Content */}
            {progress.status === 'idle' && renderOperationContent()}
          </div>

          <DialogFooter>
            {progress.status === 'idle' && (
              <>
                <Button variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={executeOperation}
                  disabled={!canExecute()}
                  variant={currentOperation?.type === 'delete' ? 'destructive' : 'default'}
                >
                  {currentOperation?.type === 'delete' ? 'Delete' : 'Apply'}
                </Button>
              </>
            )}
            {progress.status === 'running' && (
              <Button disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </Button>
            )}
            {progress.status === 'completed' && (
              <Button onClick={closeDialog}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}