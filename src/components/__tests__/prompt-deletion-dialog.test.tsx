import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PromptDeletionDialog } from '../prompt-deletion-dialog'
import { Prompt } from '@/lib/types'

// Mock the database functions
jest.mock('@/lib/db', () => ({
  analyzePromptDeletionImpact: jest.fn(),
  analyzeBulkPromptDeletionImpact: jest.fn(),
  deletePromptWithCascade: jest.fn(),
  bulkDeletePromptsWithCascade: jest.fn(),
}))

const mockPrompt: Prompt = {
  id: 'test-prompt-1',
  title: 'Test Prompt',
  content: 'This is a test prompt content',
  tags: ['test', 'demo'],
  sharing: 'team',
  createdBy: 'user-1',
  teamId: 'team-1',
  createdAt: '2024-01-01T00:00:00Z',
  usageCount: 5,
  lastUsed: '2024-01-15T00:00:00Z',
  assignedTeams: ['team-1']
}

const mockImpactAnalysis = {
  promptId: 'test-prompt-1',
  prompt: mockPrompt,
  affectedTeams: [
    {
      teamId: 'team-1',
      teamName: 'Test Team',
      memberCount: 3,
      assignment: {
        teamId: 'team-1',
        promptId: 'test-prompt-1',
        assignedBy: 'user-1',
        assignedAt: '2024-01-01T00:00:00Z',
        permissions: { canEdit: true, canDelete: true, canReassign: true }
      }
    }
  ],
  affectedUsers: [
    {
      userId: 'user-1',
      userEmail: 'user1@example.com',
      teamId: 'team-1',
      usageCount: 3,
      lastUsed: '2024-01-15T00:00:00Z'
    }
  ],
  usageAnalytics: {
    totalUsage: 5,
    lastUsed: '2024-01-15T00:00:00Z',
    usageByTeam: { 'team-1': 5 },
    usageByUser: { 'user-1': 3, 'user-2': 2 },
    usageTrend: []
  },
  totalImpactScore: 45,
  canDelete: true,
  warnings: ['This prompt is assigned to 1 team(s)']
}

describe('PromptDeletionDialog', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnDeleteComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders dialog when open', () => {
    render(
      <PromptDeletionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        promptIds={['test-prompt-1']}
        prompts={[mockPrompt]}
        onDeleteComplete={mockOnDeleteComplete}
      />
    )

    expect(screen.getByText('Delete Prompt')).toBeInTheDocument()
    expect(screen.getByText('This action cannot be undone easily. Please review the impact analysis below.')).toBeInTheDocument()
  })

  it('shows bulk deletion title for multiple prompts', () => {
    render(
      <PromptDeletionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        promptIds={['test-prompt-1', 'test-prompt-2']}
        prompts={[mockPrompt]}
        onDeleteComplete={mockOnDeleteComplete}
      />
    )

    expect(screen.getByText('Delete 2 Prompts')).toBeInTheDocument()
  })

  it('shows analyzing state initially', () => {
    render(
      <PromptDeletionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        promptIds={['test-prompt-1']}
        prompts={[mockPrompt]}
        onDeleteComplete={mockOnDeleteComplete}
      />
    )

    expect(screen.getByText('Analyzing deletion impact...')).toBeInTheDocument()
  })

  it('disables delete button until confirmation is checked', async () => {
    const { analyzePromptDeletionImpact } = require('@/lib/db')
    analyzePromptDeletionImpact.mockResolvedValue(mockImpactAnalysis)

    render(
      <PromptDeletionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        promptIds={['test-prompt-1']}
        prompts={[mockPrompt]}
        onDeleteComplete={mockOnDeleteComplete}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    const deleteButton = screen.getByRole('button', { name: /delete prompt/i })
    expect(deleteButton).toBeDisabled()

    const checkbox = screen.getByRole('checkbox', { name: /i understand the impact/i })
    fireEvent.click(checkbox)

    expect(deleteButton).toBeEnabled()
  })
})