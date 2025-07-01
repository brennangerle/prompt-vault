import type { TeamMember } from '@/lib/types';

// Mock team data based on team IDs
export const mockTeamData: Record<string, TeamMember[]> = {
  't1': [
    {
      id: '1',
      email: 'tester1@t1.com',
      role: 'admin',
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      email: 'tester2@t1.com',
      role: 'member',
      joinedAt: '2024-01-02T00:00:00Z',
    },
  ],
  't2': [
    {
      id: '3',
      email: 'tester3@t2.com',
      role: 'admin',
      joinedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '4',
      email: 'tester4@t2.com',
      role: 'member',
      joinedAt: '2024-01-03T00:00:00Z',
    },
  ],
};

export function getTeamMembers(teamId: string): TeamMember[] {
  return mockTeamData[teamId] || [];
}

export function getUserTeam(userEmail: string): string | null {
  for (const [teamId, members] of Object.entries(mockTeamData)) {
    if (members.some(member => member.email === userEmail)) {
      return teamId;
    }
  }
  return null;
}

export function isUserAdmin(userEmail: string, teamId: string): boolean {
  const teamMembers = getTeamMembers(teamId);
  const user = teamMembers.find(member => member.email === userEmail);
  return user?.role === 'admin';
}

export function canViewTeam(viewerTeamId: string, targetTeamId: string): boolean {
  // Team t1 can see team t2, but team t2 can only see itself
  if (viewerTeamId === 't1') {
    return targetTeamId === 't1' || targetTeamId === 't2';
  }
  if (viewerTeamId === 't2') {
    return targetTeamId === 't2';
  }
  // Other teams can only see themselves
  return viewerTeamId === targetTeamId;
}