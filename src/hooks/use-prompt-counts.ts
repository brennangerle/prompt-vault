'use client';

import { useState, useEffect } from 'react';
import { getAllTeams, getPromptsBySharing } from '@/lib/db';
import type { Team } from '@/lib/types';

interface UsePromptCountsReturn {
  teams: Team[];
  promptCounts: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePromptCounts(): UsePromptCountsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [promptCounts, setPromptCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch teams and global prompts in parallel
      const [teamsData, globalPrompts] = await Promise.all([
        getAllTeams(),
        getPromptsBySharing('global')
      ]);

      setTeams(teamsData);

      // Initialize counts with global prompts
      const counts: Record<string, number> = {
        global: globalPrompts.length
      };

      // Fetch team-specific prompt counts
      const teamPromptPromises = teamsData.map(async (team) => {
        try {
          const teamPrompts = await getPromptsBySharing('team', team.id);
          // Filter to only team-specific prompts (not global ones)
          const teamSpecificPrompts = teamPrompts.filter(p => p.sharing === 'team' && p.teamId === team.id);
          return { teamId: team.id, count: teamSpecificPrompts.length };
        } catch (error) {
          console.error(`Failed to fetch prompts for team ${team.id}:`, error);
          return { teamId: team.id, count: 0 };
        }
      });

      const teamCounts = await Promise.all(teamPromptPromises);
      
      // Add team counts to the counts object
      teamCounts.forEach(({ teamId, count }) => {
        counts[teamId] = count;
      });

      setPromptCounts(counts);
    } catch (err) {
      console.error('Failed to fetch prompt counts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    teams,
    promptCounts,
    isLoading,
    error,
    refetch: fetchData
  };
}