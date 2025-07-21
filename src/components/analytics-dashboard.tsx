'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CalendarIcon, 
  TrendingUp, 
  Users, 
  Eye, 
  Copy, 
  Zap, 
  BarChart3,
  Search,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  getPromptUsageLogs,
  getAllTeams,
  getAllUsers,
  getAllPrompts
} from '@/lib/db';
import type { 
  PromptUsageLog, 
  Team, 
  User,
  Prompt
} from '@/lib/types';

interface AnalyticsDashboardProps {
  className?: string;
}

interface DashboardFilters {
  dateRange: {
    from: Date;
    to: Date;
  };
  teamId: string;
  userId: string;
  promptId: string;
  actions: string[];
}

interface DashboardStats {
  totalUsage: number;
  uniqueUsers: number;
  uniqueTeams: number;
  uniquePrompts: number;
  topActions: { action: string; count: number }[];
  usageTrend: { date: string; count: number }[];
  topUsers: { userId: string; email: string; count: number }[];
  topTeams: { teamId: string; name: string; count: number }[];
  topPrompts: { promptId: string; title: string; count: number }[];
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [logs, setLogs] = useState<PromptUsageLog[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
    teamId: 'all',
    userId: 'all',
    promptId: 'all',
    actions: []
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (teams.length && users.length && prompts.length) {
      loadAnalytics();
    }
  }, [filters, teams, users, prompts]);

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [teamsData, usersData, promptsData] = await Promise.all([
        getAllTeams(),
        getAllUsers(),
        getAllPrompts()
      ]);
      
      setTeams(teamsData);
      setUsers(usersData);
      setPrompts(promptsData);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get all usage logs
      const allLogs = await getPromptUsageLogs();
      
      // Apply filters
      let filteredLogs = allLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        const inDateRange = logDate >= startOfDay(filters.dateRange.from) && 
                           logDate <= endOfDay(filters.dateRange.to);
        const inTeam = filters.teamId === 'all' || log.teamId === filters.teamId || 
                      (filters.teamId === 'no-team' && !log.teamId);
        const inUser = filters.userId === 'all' || log.userId === filters.userId;
        const inPrompt = filters.promptId === 'all' || log.promptId === filters.promptId;
        const inActions = filters.actions.length === 0 || filters.actions.includes(log.action);
        
        return inDateRange && inTeam && inUser && inPrompt && inActions;
      });

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredLogs = filteredLogs.filter(log => {
          const user = users.find(u => u.id === log.userId);
          const team = teams.find(t => t.id === log.teamId);
          const prompt = prompts.find(p => p.id === log.promptId);
          
          return (
            log.action.toLowerCase().includes(query) ||
            user?.email.toLowerCase().includes(query) ||
            team?.name.toLowerCase().includes(query) ||
            prompt?.title.toLowerCase().includes(query)
          );
        });
      }

      setLogs(filteredLogs);

      // Calculate statistics
      const usageActions = ['viewed', 'copied', 'used', 'optimized'];
      const usageLogs = filteredLogs.filter(log => usageActions.includes(log.action));
      
      const uniqueUsers = new Set(usageLogs.map(log => log.userId)).size;
      const uniqueTeams = new Set(usageLogs.map(log => log.teamId).filter(Boolean)).size;
      const uniquePrompts = new Set(usageLogs.map(log => log.promptId)).size;

      // Top actions
      const actionCounts: Record<string, number> = {};
      usageLogs.forEach(log => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      });
      const topActions = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);

      // Usage trend
      const dailyUsage: Record<string, number> = {};
      usageLogs.forEach(log => {
        const date = log.timestamp.split('T')[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + 1;
      });
      const usageTrend = Object.entries(dailyUsage)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top users
      const userCounts: Record<string, number> = {};
      usageLogs.forEach(log => {
        userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
      });
      const topUsers = Object.entries(userCounts)
        .map(([userId, count]) => ({
          userId,
          email: users.find(u => u.id === userId)?.email || userId,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top teams
      const teamCounts: Record<string, number> = {};
      usageLogs.forEach(log => {
        const teamKey = log.teamId || 'no-team';
        teamCounts[teamKey] = (teamCounts[teamKey] || 0) + 1;
      });
      const topTeams = Object.entries(teamCounts)
        .map(([teamId, count]) => ({
          teamId,
          name: teamId === 'no-team' ? 'No Team' : teams.find(t => t.id === teamId)?.name || teamId,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top prompts
      const promptCounts: Record<string, number> = {};
      usageLogs.forEach(log => {
        promptCounts[log.promptId] = (promptCounts[log.promptId] || 0) + 1;
      });
      const topPrompts = Object.entries(promptCounts)
        .map(([promptId, count]) => ({
          promptId,
          title: prompts.find(p => p.id === promptId)?.title || promptId,
          count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalUsage: usageLogs.length,
        uniqueUsers,
        uniqueTeams,
        uniquePrompts,
        topActions,
        usageTrend,
        topUsers,
        topTeams,
        topPrompts
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    if (!stats || !logs.length) return;
    
    const exportData = {
      summary: stats,
      logs: logs.map(log => ({
        ...log,
        userEmail: users.find(u => u.id === log.userId)?.email,
        teamName: log.teamId ? teams.find(t => t.id === log.teamId)?.name : 'No Team',
        promptTitle: prompts.find(p => p.id === log.promptId)?.title
      })),
      exportedAt: new Date().toISOString(),
      filters
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          <CardTitle>Analytics Dashboard</CardTitle>
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
          <CardTitle>Analytics Dashboard</CardTitle>
          <CardDescription>Error loading analytics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">{error}</div>
          <Button onClick={loadInitialData} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Comprehensive usage analytics and insights
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={loadAnalytics} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(filters.dateRange.from, "LLL dd, y")} - {format(filters.dateRange.to, "LLL dd, y")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={{ from: filters.dateRange.from, to: filters.dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setFilters(prev => ({
                        ...prev,
                        dateRange: { from: range.from, to: range.to }
                      }));
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Select 
              value={filters.teamId} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, teamId: value }))}
            >
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

            <Select 
              value={filters.userId} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.slice(0, 20).map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {stats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{stats.totalUsage}</div>
                      </div>
                      <p className="text-xs text-muted-foreground">Total Usage</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
                      </div>
                      <p className="text-xs text-muted-foreground">Active Users</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{stats.uniqueTeams}</div>
                      </div>
                      <p className="text-xs text-muted-foreground">Active Teams</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <div className="text-2xl font-bold">{stats.uniquePrompts}</div>
                      </div>
                      <p className="text-xs text-muted-foreground">Used Prompts</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {stats.topActions.map(({ action, count }) => (
                          <div key={action} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className={cn("p-1 rounded", getActionColor(action))}>
                                {getActionIcon(action)}
                              </div>
                              <span className="capitalize">{action}</span>
                            </div>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {logs.slice(0, 10).map((log, index) => (
                          <div key={`${log.id || index}`} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <div className={cn("p-1 rounded", getActionColor(log.action))}>
                                {getActionIcon(log.action)}
                              </div>
                              <span className="capitalize">{log.action}</span>
                            </div>
                            <span className="text-muted-foreground">
                              {format(new Date(log.timestamp), "HH:mm")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            {stats?.usageTrend && stats.usageTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Usage Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-end space-x-1">
                    {stats.usageTrend.map((point, index) => (
                      <div
                        key={point.date}
                        className="bg-blue-500 rounded-t flex-1 min-w-[2px] relative group"
                        style={{ 
                          height: `${Math.max((point.count / Math.max(...stats.usageTrend.map(p => p.count))) * 100, 5)}%` 
                        }}
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

          <TabsContent value="users" className="space-y-4">
            {stats?.topUsers && (
              <div className="space-y-2">
                {stats.topUsers.map(({ userId, email, count }) => (
                  <div key={userId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium">
                          {email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium">{email}</span>
                    </div>
                    <Badge variant="secondary">{count} uses</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            {stats?.topTeams && (
              <div className="space-y-2">
                {stats.topTeams.map(({ teamId, name, count }) => (
                  <div key={teamId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{name}</span>
                    </div>
                    <Badge variant="secondary">{count} uses</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="prompts" className="space-y-4">
            {stats?.topPrompts && (
              <div className="space-y-2">
                {stats.topPrompts.map(({ promptId, title, count }) => (
                  <div key={promptId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{title}</span>
                    </div>
                    <Badge variant="secondary">{count} uses</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}