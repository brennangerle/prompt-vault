'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getPromptUsageAnalytics, 
  getPromptUsageLogs, 
  logPromptUsage,
  getAllTeams,
  getAllUsers
} from '@/lib/db';
import type { 
  PromptUsageAnalytics, 
  PromptUsageLog, 
  Team, 
  User 
} from '@/lib/types';

interface UsePromptAnalyticsOptions {
  promptId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface AnalyticsFilters {
  dateRange?: {
    from: Date;
    to: Date;
  };
  teamId?: string;
  userId?: string;
  actions?: string[];
}

interface UsePromptAnalyticsReturn {
  analytics: PromptUsageAnalytics | null;
  logs: PromptUsageLog[];
  teams: Team[];
  users: User[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  trackUsage: (action: 'viewed' | 'copied' | 'used' | 'optimized', userId: string, teamId?: string) => Promise<void>;
  getFilteredAnalytics: (filters: AnalyticsFilters) => Promise<PromptUsageAnalytics>;
  getTopUsers: (limit?: number) => { userId: string; email: string; count: number }[];
  getTopTeams: (limit?: number) => { teamId: string; name: string; count: number }[];
  getTrendData: (days?: number) => { date: string; count: number }[];
}

export function usePromptAnalytics(options: UsePromptAnalyticsOptions = {}): UsePromptAnalyticsReturn {
  const { promptId, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [analytics, setAnalytics] = useState<PromptUsageAnalytics | null>(null);
  const [logs, setLogs] = useState<PromptUsageLog[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeamsAndUsers = useCallback(async () => {
    try {
      const [teamsData, usersData] = await Promise.all([
        getAllTeams(),
        getAllUsers()
      ]);
      setTeams(teamsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading teams and users:', err);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!promptId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [analyticsData, logsData] = await Promise.all([
        getPromptUsageAnalytics(promptId),
        getPromptUsageLogs(promptId)
      ]);
      
      setAnalytics(analyticsData);
      setLogs(logsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [promptId]);

  const trackUsage = useCallback(async (
    action: 'viewed' | 'copied' | 'used' | 'optimized',
    userId: string,
    teamId?: string
  ) => {
    if (!promptId) return;
    
    try {
      await logPromptUsage(promptId, userId, teamId || null, action);
      // Refresh analytics after tracking
      await refresh();
    } catch (err) {
      console.error('Error tracking usage:', err);
      throw err;
    }
  }, [promptId, refresh]);

  const getFilteredAnalytics = useCallback(async (filters: AnalyticsFilters): Promise<PromptUsageAnalytics> => {
    if (!promptId) {
      return {
        totalUsage: 0,
        lastUsed: null,
        usageByTeam: {},
        usageByUser: {},
        usageTrend: []
      };
    }

    try {
      const allLogs = await getPromptUsageLogs(promptId);
      
      // Apply filters
      let filteredLogs = allLogs.filter(log => 
        ['viewed', 'copied', 'used', 'optimized'].includes(log.action)
      );

      if (filters.dateRange) {
        filteredLogs = filteredLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= filters.dateRange!.from && logDate <= filters.dateRange!.to;
        });
      }

      if (filters.teamId) {
        filteredLogs = filteredLogs.filter(log => log.teamId === filters.teamId);
      }

      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }

      if (filters.actions && filters.actions.length > 0) {
        filteredLogs = filteredLogs.filter(log => filters.actions!.includes(log.action));
      }

      // Calculate analytics from filtered logs
      const filteredAnalytics: PromptUsageAnalytics = {
        totalUsage: filteredLogs.length,
        lastUsed: filteredLogs.length > 0 ? 
          filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp : 
          null,
        usageByTeam: {},
        usageByUser: {},
        usageTrend: []
      };

      // Calculate usage by team
      filteredLogs.forEach(log => {
        const teamKey = log.teamId || 'no-team';
        filteredAnalytics.usageByTeam[teamKey] = (filteredAnalytics.usageByTeam[teamKey] || 0) + 1;
      });

      // Calculate usage by user
      filteredLogs.forEach(log => {
        filteredAnalytics.usageByUser[log.userId] = (filteredAnalytics.usageByUser[log.userId] || 0) + 1;
      });

      // Calculate usage trend
      const dailyUsage: Record<string, number> = {};
      filteredLogs.forEach(log => {
        const date = log.timestamp.split('T')[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + 1;
      });

      filteredAnalytics.usageTrend = Object.entries(dailyUsage)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return filteredAnalytics;
    } catch (err) {
      console.error('Error getting filtered analytics:', err);
      throw err;
    }
  }, [promptId]);

  const getTopUsers = useCallback((limit = 10) => {
    if (!analytics || !users.length) return [];

    const userMap = new Map(users.map(user => [user.id, user.email]));
    
    return Object.entries(analytics.usageByUser)
      .map(([userId, count]) => ({
        userId,
        email: userMap.get(userId) || userId,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [analytics, users]);

  const getTopTeams = useCallback((limit = 10) => {
    if (!analytics || !teams.length) return [];

    const teamMap = new Map(teams.map(team => [team.id, team.name]));
    teamMap.set('no-team', 'No Team');
    
    return Object.entries(analytics.usageByTeam)
      .map(([teamId, count]) => ({
        teamId,
        name: teamMap.get(teamId) || teamId,
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [analytics, teams]);

  const getTrendData = useCallback((days = 30) => {
    if (!analytics) return [];

    const now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // Create array of all dates in range
    const dateArray: string[] = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      dateArray.push(d.toISOString().split('T')[0]);
    }

    // Map trend data to include zero values for missing dates
    const trendMap = new Map(analytics.usageTrend.map(point => [point.date, point.count]));
    
    return dateArray.map(date => ({
      date,
      count: trendMap.get(date) || 0
    }));
  }, [analytics]);

  // Load teams and users on mount
  useEffect(() => {
    loadTeamsAndUsers();
  }, [loadTeamsAndUsers]);

  // Load analytics when promptId changes
  useEffect(() => {
    if (promptId) {
      refresh();
    }
  }, [promptId, refresh]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (!autoRefresh || !promptId) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, promptId, refresh, refreshInterval]);

  return {
    analytics,
    logs,
    teams,
    users,
    loading,
    error,
    refresh,
    trackUsage,
    getFilteredAnalytics,
    getTopUsers,
    getTopTeams,
    getTrendData
  };
}