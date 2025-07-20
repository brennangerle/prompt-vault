'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Building, Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { Team } from '@/lib/types';

interface TeamPromptSelectorProps {
  teams: Team[];
  selectedTeam: string | null;
  onTeamSelect: (teamId: string | null) => void;
  promptCounts: Record<string, number>;
  isLoading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
}

export function TeamPromptSelector({
  teams,
  selectedTeam,
  onTeamSelect,
  promptCounts,
  isLoading = false,
  error = null,
  onRefresh
}: TeamPromptSelectorProps) {
  const globalPromptCount = promptCounts['global'] || 0;
  const selectedTeamData = teams.find(team => team.id === selectedTeam);

  const handleValueChange = (value: string) => {
    if (value === 'global') {
      onTeamSelect(null);
    } else {
      onTeamSelect(value);
    }
  };

  const getCurrentValue = () => {
    return selectedTeam || 'global';
  };

  const getCurrentDisplayText = () => {
    if (!selectedTeam) {
      return `Global Prompts (${globalPromptCount})`;
    }
    
    const team = teams.find(t => t.id === selectedTeam);
    const count = promptCounts[selectedTeam] || 0;
    return team ? `${team.name} (${count})` : `Team (${count})`;
  };

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load team data: {error}</span>
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 glass-light">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            <span className="font-medium text-sm">Team Selection:</span>
          </div>
          
          <div className="flex-1 max-w-md">
            <Select
              value={getCurrentValue()}
              onValueChange={handleValueChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading teams...</span>
                    </div>
                  ) : (
                    getCurrentDisplayText()
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {/* Global option */}
                <SelectItem value="global">
                  <div className="flex items-center gap-2 w-full">
                    <Globe className="h-4 w-4 text-emerald-500" />
                    <span>Global Prompts</span>
                    <Badge variant="secondary" className="ml-auto">
                      {globalPromptCount}
                    </Badge>
                  </div>
                </SelectItem>
                
                {/* Team options */}
                {teams.map((team) => {
                  const count = promptCounts[team.id] || 0;
                  return (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center gap-2 w-full">
                        <Building className="h-4 w-4 text-primary" />
                        <span>{team.name}</span>
                        <Badge variant="outline" className="ml-auto">
                          {count}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
                
                {teams.length === 0 && !isLoading && (
                  <SelectItem value="no-teams" disabled>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">No teams available</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Current selection info */}
          <div className="flex items-center gap-2">
            {selectedTeam ? (
              <>
                <Building className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Team: {selectedTeamData?.name || 'Unknown'}
                </span>
              </>
            ) : (
              <>
                <Globe className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-muted-foreground">
                  Viewing global prompts
                </span>
              </>
            )}
          </div>
        </div>

        {/* Additional team info when team is selected */}
        {selectedTeam && selectedTeamData && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Members: {selectedTeamData.members.length}</span>
                <span>Created: {new Date(selectedTeamData.createdAt || '').toLocaleDateString()}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                ID: {selectedTeam}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}