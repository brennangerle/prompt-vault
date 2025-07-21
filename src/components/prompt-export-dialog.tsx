'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Users, Globe } from 'lucide-react';
import { exportPrompts } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import type { Team, Prompt, PromptExportData } from '@/lib/types';

interface PromptExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  prompts: Prompt[];
  selectedPrompts: string[];
  currentUserId: string;
}

export function PromptExportDialog({
  open,
  onOpenChange,
  teams,
  prompts,
  selectedPrompts,
  currentUserId
}: PromptExportDialogProps) {
  const [exportScope, setExportScope] = useState<'global' | 'team' | 'selected'>('global');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'json'>('json');
  const [includeTeamAssignments, setIncludeTeamAssignments] = useState(true);
  const [includeUsageData, setIncludeUsageData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const { toast } = useToast();

  const getExportPreview = () => {
    let promptCount = 0;
    let teamsIncluded: string[] = [];

    if (exportScope === 'global') {
      promptCount = prompts.length;
      teamsIncluded = Array.from(new Set(prompts.map(p => p.teamId).filter(Boolean))) as string[];
    } else if (exportScope === 'team' && selectedTeamId) {
      promptCount = prompts.filter(p => 
        p.sharing === 'global' || 
        (p.sharing === 'team' && p.teamId === selectedTeamId) ||
        p.assignedTeams?.includes(selectedTeamId)
      ).length;
      teamsIncluded = [selectedTeamId];
    } else if (exportScope === 'selected') {
      promptCount = selectedPrompts.length;
      const selectedPromptData = prompts.filter(p => selectedPrompts.includes(p.id));
      teamsIncluded = Array.from(new Set(
        selectedPromptData.flatMap(p => [
          ...(p.teamId ? [p.teamId] : []),
          ...(p.assignedTeams || [])
        ])
      ));
    }

    return { promptCount, teamsIncluded };
  };

  const handleExport = async () => {
    if (exportScope === 'team' && !selectedTeamId) {
      toast({
        title: 'Team Required',
        description: 'Please select a team for team-scoped export.',
        variant: 'destructive'
      });
      return;
    }

    if (exportScope === 'selected' && selectedPrompts.length === 0) {
      toast({
        title: 'No Prompts Selected',
        description: 'Please select prompts to export.',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);

    try {
      const exportData = await exportPrompts({
        scope: exportScope,
        teamId: selectedTeamId || undefined,
        selectedPromptIds: exportScope === 'selected' ? selectedPrompts : undefined,
        exportedBy: currentUserId
      });

      // Create and download file
      const fileName = `prompts-export-${exportScope}-${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${exportData.prompts.length} prompts to ${fileName}`
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const preview = getExportPreview();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Prompts
          </DialogTitle>
          <DialogDescription>
            Export prompts and their configurations to a JSON file for backup or migration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Scope */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Scope</Label>
            <RadioGroup value={exportScope} onValueChange={(value: any) => setExportScope(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="global" id="global" />
                <Label htmlFor="global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  All Prompts (Global)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team-Specific Prompts
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="selected" id="selected" />
                <Label htmlFor="selected" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Selected Prompts ({selectedPrompts.length})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Team Selection */}
          {exportScope === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="team-select">Select Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name} ({team.members.length} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="team-assignments"
                  checked={includeTeamAssignments}
                  onCheckedChange={(checked) => setIncludeTeamAssignments(checked as boolean)}
                />
                <Label htmlFor="team-assignments">Include team assignments</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="usage-data"
                  checked={includeUsageData}
                  onCheckedChange={(checked) => setIncludeUsageData(checked as boolean)}
                />
                <Label htmlFor="usage-data">Include usage statistics (coming soon)</Label>
              </div>
            </div>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format-select">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Export Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Preview</CardTitle>
              <CardDescription>
                Review what will be included in your export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Prompts</div>
                  <div className="text-2xl font-bold">{preview.promptCount}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Teams</div>
                  <div className="text-2xl font-bold">{preview.teamsIncluded.length}</div>
                </div>
              </div>
              
              {preview.teamsIncluded.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Teams Included</div>
                  <div className="flex flex-wrap gap-1">
                    {preview.teamsIncluded.map((teamId) => {
                      const team = teams.find(t => t.id === teamId);
                      return (
                        <Badge key={teamId} variant="secondary">
                          {team?.name || teamId}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Export will include: prompt content, metadata, tags, sharing settings
                {includeTeamAssignments && ', team assignments'}
                {includeUsageData && ', usage statistics'}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export Prompts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}