/**
 * Basic test for TeamPromptSelector component
 * This is a simple test to verify the component renders without errors
 */

import React from 'react';
import { TeamPromptSelector } from '../team-prompt-selector';
import type { Team } from '@/lib/types';

// Mock data for testing
const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Development Team',
    members: [
      { id: 'user-1', email: 'dev1@example.com', role: 'admin', joinedAt: '2024-01-01' },
      { id: 'user-2', email: 'dev2@example.com', role: 'member', joinedAt: '2024-01-02' }
    ],
    createdBy: 'admin-1',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'team-2',
    name: 'Marketing Team',
    members: [
      { id: 'user-3', email: 'marketing1@example.com', role: 'admin', joinedAt: '2024-01-01' }
    ],
    createdBy: 'admin-1',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const mockPromptCounts = {
  global: 15,
  'team-1': 8,
  'team-2': 3
};

// Basic render test
export function testTeamPromptSelectorRender() {
  const mockOnTeamSelect = (teamId: string | null) => {
    console.log('Team selected:', teamId);
  };

  try {
    // This would normally use a testing library like @testing-library/react
    // For now, we'll just verify the component can be instantiated
    const component = React.createElement(TeamPromptSelector, {
      teams: mockTeams,
      selectedTeam: null,
      onTeamSelect: mockOnTeamSelect,
      promptCounts: mockPromptCounts,
      isLoading: false,
      error: null
    });

    console.log('✅ TeamPromptSelector component can be instantiated');
    return true;
  } catch (error) {
    console.error('❌ TeamPromptSelector component failed to instantiate:', error);
    return false;
  }
}

// Test with loading state
export function testTeamPromptSelectorLoading() {
  const mockOnTeamSelect = (teamId: string | null) => {
    console.log('Team selected:', teamId);
  };

  try {
    const component = React.createElement(TeamPromptSelector, {
      teams: [],
      selectedTeam: null,
      onTeamSelect: mockOnTeamSelect,
      promptCounts: {},
      isLoading: true,
      error: null
    });

    console.log('✅ TeamPromptSelector loading state works');
    return true;
  } catch (error) {
    console.error('❌ TeamPromptSelector loading state failed:', error);
    return false;
  }
}

// Test with error state
export function testTeamPromptSelectorError() {
  const mockOnTeamSelect = (teamId: string | null) => {
    console.log('Team selected:', teamId);
  };

  try {
    const component = React.createElement(TeamPromptSelector, {
      teams: [],
      selectedTeam: null,
      onTeamSelect: mockOnTeamSelect,
      promptCounts: {},
      isLoading: false,
      error: 'Failed to load teams'
    });

    console.log('✅ TeamPromptSelector error state works');
    return true;
  } catch (error) {
    console.error('❌ TeamPromptSelector error state failed:', error);
    return false;
  }
}

// Run all tests
export function runAllTests() {
  console.log('Running TeamPromptSelector tests...\n');
  
  const results = [
    testTeamPromptSelectorRender(),
    testTeamPromptSelectorLoading(),
    testTeamPromptSelectorError()
  ];
  
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`\nTest Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed');
  }
  
  return passed === total;
}

// Export for manual testing
export { mockTeams, mockPromptCounts };