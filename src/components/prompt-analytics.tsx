'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, TrendingUp, Users, Eye, Copy, Zap, BarChart3 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  getPromptUsageAnalytics, 
  getPromptUsageLogs, 
  getAllTeams,
  getAllUsers 
} from '@/lib/db';
import type { 
  PromptUsageAnalytics as PromptUsageAnalyticsType, 
  PromptUsageLog, 
  Team, 
  User 
} from '@/lib/types';

interface PromptAnalyticsProps {
  promptId: string;
  className?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface FilteredAnalytics extends PromptUsageAnalyticsType {
  filteredLogs: PromptUsageLog[];
  teamNames: Record<string, string>;
  userEmails: Record<string, string>;
}

export function PromptAnalytics({ promptId, className }: PromptAnalyticsProps) {
  const [analytics, setAnalytics] = useState<FilteredAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    loadTeamsAndUsers();
  }, []);

  useEffect(() => {
    if (promptId) {
      loadAnalytics();
    }
  }, [promptId, dateRange, selectedTeam]);

  const loadTeamsAndUsers = async () => {
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
  };

  const loadAnalytics = async () => {
    if (!promptId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [analyticsData, allLogs] = await Promise.all([
        getPromptUsageAnalytics(promptId),
        getPromptUsageLogs(promptId)
      ]);

      // Filter logs by date range and team
      const filteredLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const inDateRange = logDate >= startOfDay(dateRange.from) && logDate <= endOfDay(dateRange.to);
        const inTeam = selectedTeam === 'all' || log.teamId === selectedTeam || (selectedTeam === 'no-team' && !log.teamId);
        return inDateRange && inTeam;
      });

      // Recalculate analytics based on filtered logs
      const filteredAnalytics: PromptUsageAnalyticsType = {
        totalUsage: filteredLogs.filter(log => ['viewed', 'copied', 'used', 'optimized'].includes(log.action)).length,
        lastUsed: filteredLogs.length > 0 ? filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp : null,
        usageByTeam: {},
        usageByUser: {},
        usageTrend: []
      };

      // Calculate usage by team
      filteredLogs.forEach(log => {
        if (['viewed', 'copied', 'used', 'optimized'].includes(log.action)) {
          const teamKey = log.teamId || 'no-team';
          filteredAnalytics.usageByTeam[teamKey] = (filteredAnalytics.usageByTeam[teamKey] || 0) + 1;
        }
      });

      // Calculate usage by user
      filteredLogs.forEach(log => {
        if (['viewed', 'copied', 'used', 'optimized'].includes(log.action)) {
          filteredAnalytics.usageByUser[log.userId] = (filteredAnalytics.usageByUser[log.userId] || 0) + 1;
        }
      });

      // Calculate usage trend
      const dailyUsage: Record<string, number> = {};
      filteredLogs.forEach(log => {
        if (['viewed', 'copied', 'used', 'optimized'].includes(log.action)) {
          const date = log.timestamp.split('T')[0];
          dailyUsage[date] = (dailyUsage[date] || 0) + 1;
        }
      });

      filteredAnalytics.usageTrend = Object.entries(dailyUsage)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Create lookup maps for team names and user emails
      const teamNames: Record<string, string> = {};
      teams.forEach(team => {
        teamNames[team.id] = team.name;
      });
      teamNames['no-team'] = 'No Team';

      const userEmails: Record<string, string> = {};
      users.forEach(user => {
        userEmails[user.id] = user.email;
      });

      setAnalytics({
        ...filteredAnalytics,
        filteredLogs,
        teamNames,
        userEmails
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'viewed': return <Eye className="h-4 w-4" />;
      case 'copied': return <Copy className="h-4 w-4" />;
      case 'used': return <Zap className="h-4 w-4" />;
      case 'optimized': return <TrendingUp className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'viewed': return 'bg-blue-100 text-blue-800';
      case 'copied': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-purple-100 text-purple-800';
      case 'optimized': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
          <CardDescription>Loading analytics data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
          <CardDescription>Error loading analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">{error}</div>
          <Button onClick={loadAnalytics} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage Analytics</CardTitle>
          <CardDescription>No analytics data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage Analytics
        </CardTitle>
        <CardDescription>
          Prompt usage statistics and trends
        </CardDescription>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="no-team">No Team</SelectItem>
              {teams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">{analytics.totalUsage}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Usage</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">{Object.keys(analytics.usageByUser).length}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Unique Users</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">{Object.keys(analytics.usageByTeam).length}</div>
                  </div>
                  <p className="text-xs text-muted-foreground">Teams</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div className="text-2xl font-bold">
                      {analytics.usageTrend.length > 1 ? 
                        Math.round(((analytics.usageTrend[analytics.usageTrend.length - 1]?.count || 0) - 
                                   (analytics.usageTrend[0]?.count || 0)) / analytics.usageTrend.length * 100) / 100 : 0}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Avg Daily</p>
                </CardContent>
              </Card>
            </div>

            {analytics.lastUsed && (
              <div className="text-sm text-muted-foreground">
                Last used: {format(new Date(analytics.lastUsed), "PPpp")}
              </div>
            )}

            {/* Usage Trend Chart */}
            {analytics.usageTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usage Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-32 flex items-end space-x-1">
                    {analytics.usageTrend.map((point, index) => (
                      <div
                        key={point.date}
                        className="bg-blue-500 rounded-t flex-1 min-w-[2px] relative group"
                        style={{ height: `${Math.max((point.count / Math.max(...analytics.usageTrend.map(p => p.count))) * 100, 5)}%` }}
                      >
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {format(new Date(point.date), "MMM dd")}: {point.count}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <div className="space-y-2">
              {Object.entries(analytics.usageByTeam)
                .sort(([,a], [,b]) => b - a)
                .map(([teamId, count]) => (
                  <div key={teamId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {analytics.teamNames[teamId] || teamId}
                      </span>
                    </div>
                    <Badge variant="secondary">{count} uses</Badge>
                  </div>
                ))}
              {Object.keys(analytics.usageByTeam).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No team usage data for the selected period
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="space-y-2">
              {Object.entries(analytics.usageByUser)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([userId, count]) => (
                  <div key={userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {(analytics.userEmails[userId] || userId).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">
                        {analytics.userEmails[userId] || userId}
                      </span>
                    </div>
                    <Badge variant="secondary">{count} uses</Badge>
                  </div>
                ))}
              {Object.keys(analytics.usageByUser).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No user usage data for the selected period
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analytics.filteredLogs
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 50)
                .map((log, index) => (
                  <div key={`${log.id || index}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={cn("p-1 rounded", getActionColor(log.action))}>
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <div className="font-medium capitalize">{log.action}</div>
                        <div className="text-sm text-muted-foreground">
                          {analytics.userEmails[log.userId] || log.userId}
                          {log.teamId && ` • ${analytics.teamNames[log.teamId] || log.teamId}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(log.timestamp), "MMM dd, HH:mm")}
                    </div>
                  </div>
                ))}
              {analytics.filteredLogs.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No activity data for the selected period
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}