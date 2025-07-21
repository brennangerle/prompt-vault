import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkOperationsToolbar, BulkOperation, BulkOperationResult } from '../bulk-operations-toolbar';
import type { Prompt, Team } from '@/lib/types';

// Mock data
const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: 'Test Prompt 1',
    content: 'Test content 1',
    tags: ['test', 'demo'],
    sharing: 'team',
    createdBy: 'user1',
    teamId: 'team1',
    createdAt: '2024-01-01T00:00:00Z',
    assignedTeams: ['team1']
  },
  {
    id: '2',
    title: 'Test Prompt 2',
    content: 'Test content 2',
    tags: ['test', 'example'],
    sharing: 'global',
    createdBy: 'user2',
    createdAt: '2024-01-02T00:00:00Z',
    assignedTeams: ['team2']
  }
];

const mockTeams: Team[] = [
  {
    id: 'team1',
    name: 'Team 1',
    members: [
      { id: 'user1', email: 'user1@test.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'team2',
    name: 'Team 2',
    members: [
      { id: 'user2', email: 'user2@test.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    createdBy: 'user2',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const mockAvailableTags = ['test', 'demo', 'example', 'new-tag'];

describe('BulkOperationsToolbar', () => {
  const defaultProps = {
    selectedPrompts: ['1', '2'],
    prompts: mockPrompts,
    teams: mockTeams,
    availableTags: mockAvailableTags,
    onBulkOperation: jest.fn(),
    onClearSelection: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when prompts are selected', () => {
    render(<BulkOperationsToolbar {...defaultProps} />);
    
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('does not render when no prompts are selected', () => {
    render(<BulkOperationsToolbar {...defaultProps} selectedPrompts={[]} />);
    
    expect(screen.queryByText('selected')).not.toBeInTheDocument();
  });

  it('calls onClearSelection when clear button is clicked', () => {
    render(<BulkOperationsToolbar {...defaultProps} />);
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    fireEvent.click(clearButton);
    
    expect(defaultProps.onClearSelection).toHaveBeenCalled();
  });

  it('opens delete dialog when delete button is clicked', () => {
    render(<BulkOperationsToolbar {...defaultProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Delete Prompts')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete 2 selected prompts/)).toBeInTheDocument();
  });

  it('opens tag operations menu when tags button is clicked', () => {
    render(<BulkOperationsToolbar {...defaultProps} />);
    
    const tagsButton = screen.getByText('Tags');
    fireEvent.click(tagsButton);
    
    expect(screen.getByText('Add Tags')).toBeInTheDocument();
    expect(screen.getByText('Remove Tags')).toBeInTheDocument();
  });

  it('opens team operations menu when teams button is clicked', () => {
    render(<BulkOperationsToolbar {...defaultProps} />);
    
    const teamsButton = screen.getByText('Teams');
    fireEvent.click(teamsButton);
    
    expect(screen.getByText('Assign to Team')).toBeInTheDocument();
    expect(screen.getByText('Unassign from Team')).toBeInTheDocument();
  });

  it('handles add tags operation', async () => {
    const mockOnBulkOperation = jest.fn().mockResolvedValue({
      successful: ['1', '2'],
      failed: [],
      operation: { type: 'add-tags', data: ['new-tag'] }
    } as BulkOperationResult);

    render(
      <BulkOperationsToolbar 
        {...defaultProps} 
        onBulkOperation={mockOnBulkOperation}
      />
    );
    
    // Open tags menu and click Add Tags
    const tagsButton = screen.getByText('Tags');
    fireEvent.click(tagsButton);
    
    const addTagsItem = screen.getByText('Add Tags');
    fireEvent.click(addTagsItem);
    
    // Dialog should open
    expect(screen.getByText('Add Tags')).toBeInTheDocument();
    expect(screen.getByText(/These tags will be added to all 2 selected prompts/)).toBeInTheDocument();
    
    // Add a tag (this would require more complex interaction with TagManager)
    // For now, just test that the dialog opens correctly
  });

  it('handles team assignment operation', async () => {
    const mockOnBulkOperation = jest.fn().mockResolvedValue({
      successful: ['1', '2'],
      failed: [],
      operation: { type: 'assign-team', data: 'team1' }
    } as BulkOperationResult);

    render(
      <BulkOperationsToolbar 
        {...defaultProps} 
        onBulkOperation={mockOnBulkOperation}
      />
    );
    
    // Open teams menu and click Assign to Team
    const teamsButton = screen.getByText('Teams');
    fireEvent.click(teamsButton);
    
    const assignTeamItem = screen.getByText('Assign to Team');
    fireEvent.click(assignTeamItem);
    
    // Dialog should open
    expect(screen.getByText('Assign to Team')).toBeInTheDocument();
    expect(screen.getByText(/All 2 selected prompts will be assigned to this team/)).toBeInTheDocument();
  });

  it('disables buttons when disabled prop is true', () => {
    render(<BulkOperationsToolbar {...defaultProps} disabled={true} />);
    
    const deleteButton = screen.getByText('Delete');
    const tagsButton = screen.getByText('Tags');
    const teamsButton = screen.getByText('Teams');
    
    expect(deleteButton).toBeDisabled();
    expect(tagsButton).toBeDisabled();
    expect(teamsButton).toBeDisabled();
  });

  it('shows progress indicator during operation', async () => {
    const mockOnBulkOperation = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            successful: ['1', '2'],
            failed: [],
            operation: { type: 'delete' }
          });
        }, 100);
      });
    });

    render(
      <BulkOperationsToolbar 
        {...defaultProps} 
        onBulkOperation={mockOnBulkOperation}
      />
    );
    
    // Open delete dialog
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Click delete in dialog
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmDeleteButton);
    
    // Should show processing state
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('shows operation results after completion', async () => {
    const mockOnBulkOperation = jest.fn().mockResolvedValue({
      successful: ['1'],
      failed: [{ promptId: '2', error: 'Test error' }],
      operation: { type: 'delete' }
    } as BulkOperationResult);

    render(
      <BulkOperationsToolbar 
        {...defaultProps} 
        onBulkOperation={mockOnBulkOperation}
      />
    );
    
    // Open delete dialog
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    
    // Click delete in dialog
    const confirmDeleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(confirmDeleteButton);
    
    // Wait for operation to complete
    await waitFor(() => {
      expect(screen.getByText(/Successfully processed 1 prompt/)).toBeInTheDocument();
      expect(screen.getByText(/Failed to process 1 prompt/)).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });
});