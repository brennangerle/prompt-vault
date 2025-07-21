import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditPromptDialog } from '../edit-prompt-dialog';
import type { Prompt, Team } from '@/lib/types';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockPrompt: Prompt = {
  id: '1',
  title: 'Test Prompt',
  content: 'This is a test prompt content that is long enough to pass validation.',
  tags: ['test', 'example'],
  software: 'Gemini',
  sharing: 'private',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  lastModified: '2024-01-02T00:00:00Z',
  modifiedBy: 'user1',
  usageCount: 5,
  lastUsed: '2024-01-03T00:00:00Z',
  assignedTeams: ['team1'],
  metadata: {
    version: 2,
    changelog: []
  }
};

const mockTeams: Team[] = [
  {
    id: 'team1',
    name: 'Test Team',
    members: [
      { id: 'user1', email: 'user1@test.com', role: 'admin', joinedAt: '2024-01-01T00:00:00Z' }
    ],
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const mockAvailableTags = ['marketing', 'content', 'social-media'];

describe('EditPromptDialog', () => {
  const mockOnUpdatePrompt = jest.fn();

  beforeEach(() => {
    mockOnUpdatePrompt.mockClear();
  });

  it('renders the dialog trigger and opens when clicked', () => {
    render(
      <EditPromptDialog
        prompt={mockPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    const trigger = screen.getByText('Edit Prompt');
    fireEvent.click(trigger);

    expect(screen.getByText('Make changes to your prompt and manage its settings.')).toBeInTheDocument();
  });

  it('displays prompt information in edit tab', () => {
    render(
      <EditPromptDialog
        prompt={mockPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    fireEvent.click(screen.getByText('Edit Prompt'));

    expect(screen.getByDisplayValue('Test Prompt')).toBeInTheDocument();
    expect(screen.getByDisplayValue('This is a test prompt content that is long enough to pass validation.')).toBeInTheDocument();
  });

  it('shows preview tab with formatted content', () => {
    render(
      <EditPromptDialog
        prompt={mockPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    fireEvent.click(screen.getByText('Edit Prompt'));
    fireEvent.click(screen.getByText('Preview'));

    expect(screen.getByText('Prompt Preview')).toBeInTheDocument();
    expect(screen.getByText('Test Prompt')).toBeInTheDocument();
  });

  it('shows analytics tab with usage statistics', () => {
    render(
      <EditPromptDialog
        prompt={mockPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    fireEvent.click(screen.getByText('Edit Prompt'));
    fireEvent.click(screen.getByText('Analytics'));

    expect(screen.getByText('Usage Statistics')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // usage count
  });

  it('handles form submission correctly', async () => {
    render(
      <EditPromptDialog
        prompt={mockPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    fireEvent.click(screen.getByText('Edit Prompt'));

    const titleInput = screen.getByDisplayValue('Test Prompt');
    fireEvent.change(titleInput, { target: { value: 'Updated Test Prompt' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdatePrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Test Prompt',
          lastModified: expect.any(String),
          modifiedBy: 'user1'
        })
      );
    });
  });

  it('shows team assignment interface when sharing is set to team', () => {
    const teamPrompt = { ...mockPrompt, sharing: 'team' as const };
    
    render(
      <EditPromptDialog
        prompt={teamPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    fireEvent.click(screen.getByText('Edit Prompt'));

    expect(screen.getByText('Assigned Teams')).toBeInTheDocument();
    expect(screen.getByText('Test Team')).toBeInTheDocument();
  });

  it('validates form fields correctly', async () => {
    render(
      <EditPromptDialog
        prompt={mockPrompt}
        onUpdatePrompt={mockOnUpdatePrompt}
        teams={mockTeams}
        availableTags={mockAvailableTags}
        currentUserId="user1"
      >
        <button>Edit Prompt</button>
      </EditPromptDialog>
    );

    fireEvent.click(screen.getByText('Edit Prompt'));

    const titleInput = screen.getByDisplayValue('Test Prompt');
    fireEvent.change(titleInput, { target: { value: 'AB' } }); // Too short

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Title must be at least 3 characters.')).toBeInTheDocument();
    });

    expect(mockOnUpdatePrompt).not.toHaveBeenCalled();
  });
});