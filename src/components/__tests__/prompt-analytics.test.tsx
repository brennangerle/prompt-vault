import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PromptAnalytics } from '../prompt-analytics';
import { usePromptAnalytics } from '../../hooks/use-prompt-analytics';
import { usageTracker } from '../../lib/usage-tracker';

// Mock the hooks and utilities
jest.mock('../../hooks/use-prompt-analytics');
jest.mock('../../lib/usage-tracker');
jest.mock('../../lib/db');
jest.mock('../../lib/auth');

const mockUsePromptAnalytics = usePromptAnalytics as jest.MockedFunction<typeof usePromptAnalytics>;
const mockUsageTracker = usageTracker as jest.Mocked<typeof usageTracker>;

const mockAnalyticsData = {
  analytics: {
    totalUsage: 150,
    lastUsed: '2024-01-15T10:30:00Z',
    usageByTeam: {
      'team-1': 80,
      'team-2': 50,
      'no-team': 20
    },
    usageByUser: {
      'user-1': 60,
      'user-2': 40,
      'user-3': 30,
      'user-4': 20
    },
    usageTrend: [
      { date: '2024-01-10', count: 10 },
      { date: '2024-01-11', count: 15 },
      { date: '2024-01-12', count: 20 },
      { date: '2024-01-13', count: 25 },
      { date: '2024-01-14', count: 30 },
      { date: '2024-01-15', count: 50 }
    ]
  },
  logs: [
    {
      id: 'log-1',
      promptId: 'prompt-1',
      userId: 'user-1',
      teamId: 'team-1',
      timestamp: '2024-01-15T10:30:00Z',
      action: 'viewed' as const
    },
    {
      id: 'log-2',
      promptId: 'prompt-1',
      userId: 'user-2',
      teamId: 'team-1',
      timestamp: '2024-01-15T09:15:00Z',
      action: 'copied' as const
    },
    {
      id: 'log-3',
      promptId: 'prompt-1',
      userId: 'user-3',
      teamId: 'team-2',
      timestamp: '2024-01-15T08:45:00Z',
      action: 'used' as const
    }
  ],
  teams: [
    { id: 'team-1', name: 'Development Team', members: [], createdAt: '2024-01-01T00:00:00Z' },
    { id: 'team-2', name: 'Design Team', members: [], createdAt: '2024-01-01T00:00:00Z' }
  ],
  users: [
    { id: 'user-1', email: 'john@example.com' },
    { id: 'user-2', email: 'jane@example.com' },
    { id: 'user-3', email: 'bob@example.com' },
    { id: 'user-4', email: 'alice@example.com' }
  ],
  loading: false,
  error: null,
  refresh: jest.fn(),
  trackUsage: jest.fn(),
  getFilteredAnalytics: jest.fn(),
  getTopUsers: jest.fn(() => [
    { userId: 'user-1', email: 'john@example.com', count: 60 },
    { userId: 'user-2', email: 'jane@example.com', count: 40 }
  ]),
  getTopTeams: jest.fn(() => [
    { teamId: 'team-1', name: 'Development Team', count: 80 },
    { teamId: 'team-2', name: 'Design Team', count: 50 }
  ]),
  getTrendData: jest.fn(() => [
    { date: '2024-01-10', count: 10 },
    { date: '2024-01-11', count: 15 },
    { date: '2024-01-12', count: 20 }
  ])
};

describe('PromptAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePromptAnalytics.mockReturnValue(mockAnalyticsData);
  });

  it('renders loading state correctly', () => {
    mockUsePromptAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      loading: true,
      analytics: null
    });

    render(<PromptAnalytics promptId="prompt-1" />);
    
    expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('renders error state correctly', () => {
    mockUsePromptAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      loading: false,
      error: 'Failed to load analytics',
      analytics: null
    });

    render(<PromptAnalytics promptId="prompt-1" />);
    
    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('renders analytics data correctly', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Usage Analytics')).toBeInTheDocument();
    });

    // Check overview stats
    expect(screen.getByText('150')).toBeInTheDocument(); // Total usage
    expect(screen.getByText('4')).toBeInTheDocument(); // Unique users
    expect(screen.getByText('3')).toBeInTheDocument(); // Teams (including no-team)
  });

  it('displays usage trend chart', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    await waitFor(() => {
      expect(screen.getByText('Usage Trend')).toBeInTheDocument();
    });

    // The chart should be rendered (we can't easily test the visual chart, but we can check for the container)
    const chartContainer = screen.getByText('Usage Trend').closest('.space-y-4');
    expect(chartContainer).toBeInTheDocument();
  });

  it('shows team breakdown in teams tab', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Click on teams tab
    const teamsTab = screen.getByRole('tab', { name: /teams/i });
    fireEvent.click(teamsTab);

    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
      expect(screen.getByText('Design Team')).toBeInTheDocument();
      expect(screen.getByText('No Team')).toBeInTheDocument();
    });

    // Check usage counts
    expect(screen.getByText('80 uses')).toBeInTheDocument();
    expect(screen.getByText('50 uses')).toBeInTheDocument();
    expect(screen.getByText('20 uses')).toBeInTheDocument();
  });

  it('shows user breakdown in users tab', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Click on users tab
    const usersTab = screen.getByRole('tab', { name: /users/i });
    fireEvent.click(usersTab);

    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    // Check usage counts
    expect(screen.getByText('60 uses')).toBeInTheDocument();
    expect(screen.getByText('40 uses')).toBeInTheDocument();
  });

  it('shows activity logs in activity tab', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Click on activity tab
    const activityTab = screen.getByRole('tab', { name: /activity/i });
    fireEvent.click(activityTab);

    await waitFor(() => {
      expect(screen.getByText('Viewed')).toBeInTheDocument();
      expect(screen.getByText('Copied')).toBeInTheDocument();
      expect(screen.getByText('Used')).toBeInTheDocument();
    });

    // Check user emails in activity
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('handles date range filtering', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Find and click the date range picker
    const dateRangePicker = screen.getByText(/Pick a date range/i);
    fireEvent.click(dateRangePicker);

    // The calendar should open (we can't easily test date selection in this test environment)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('handles team filtering', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Find the team filter dropdown
    const teamFilter = screen.getByDisplayValue('All Teams');
    fireEvent.click(teamFilter);

    await waitFor(() => {
      expect(screen.getByText('Development Team')).toBeInTheDocument();
      expect(screen.getByText('Design Team')).toBeInTheDocument();
    });
  });

  it('calls refresh function when retry button is clicked', async () => {
    const mockRefresh = jest.fn();
    mockUsePromptAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      loading: false,
      error: 'Failed to load analytics',
      analytics: null,
      refresh: mockRefresh
    });

    render(<PromptAnalytics promptId="prompt-1" />);
    
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('handles empty analytics data gracefully', () => {
    mockUsePromptAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      analytics: {
        totalUsage: 0,
        lastUsed: null,
        usageByTeam: {},
        usageByUser: {},
        usageTrend: []
      }
    });

    render(<PromptAnalytics promptId="prompt-1" />);
    
    expect(screen.getByText('0')).toBeInTheDocument(); // Total usage should be 0
  });

  it('displays last used date when available', async () => {
    render(<PromptAnalytics promptId="prompt-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Last used:/)).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <PromptAnalytics promptId="prompt-1" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('PromptAnalytics Integration', () => {
  it('integrates with usage tracker correctly', async () => {
    const mockTrackUsage = jest.fn();
    mockUsePromptAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      trackUsage: mockTrackUsage
    });

    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Verify that the component is ready to track usage
    expect(mockUsePromptAnalytics).toHaveBeenCalledWith({
      promptId: 'prompt-1',
      autoRefresh: false,
      refreshInterval: 30000
    });
  });

  it('handles real-time updates', async () => {
    const mockRefresh = jest.fn();
    mockUsePromptAnalytics.mockReturnValue({
      ...mockAnalyticsData,
      refresh: mockRefresh
    });

    render(<PromptAnalytics promptId="prompt-1" />);
    
    // Simulate a real-time update by changing the promptId
    const { rerender } = render(<PromptAnalytics promptId="prompt-2" />);
    
    // The hook should be called with the new promptId
    expect(mockUsePromptAnalytics).toHaveBeenCalledWith({
      promptId: 'prompt-2',
      autoRefresh: false,
      refreshInterval: 30000
    });
  });
});