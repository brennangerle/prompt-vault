import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptExportDialog } from '../prompt-export-dialog';
import { PromptImportDialog } from '../prompt-import-dialog';
import type { Team, Prompt } from '@/lib/types';

// Mock the database functions
jest.mock('@/lib/db', () => ({
  exportPrompts: jest.fn(),
  validateImportData: jest.fn(),
  previewImport: jest.fn(),
  importPrompts: jest.fn(),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Test Team',
    members: [
      { id: 'user-1', email: 'test@example.com', role: 'admin', joinedAt: '2024-01-01' }
    ],
    createdBy: 'user-1',
    createdAt: '2024-01-01'
  }
];

const mockPrompts: Prompt[] = [
  {
    id: 'prompt-1',
    title: 'Test Prompt',
    content: 'Test content',
    tags: ['test'],
    sharing: 'team',
    createdBy: 'user-1',
    teamId: 'team-1',
    createdAt: '2024-01-01'
  }
];

describe('PromptExportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    teams: mockTeams,
    prompts: mockPrompts,
    selectedPrompts: ['prompt-1'],
    currentUserId: 'user-1'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export dialog with correct title', () => {
    render(<PromptExportDialog {...defaultProps} />);
    expect(screen.getByText('Export Prompts')).toBeInTheDocument();
  });

  it('shows export scope options', () => {
    render(<PromptExportDialog {...defaultProps} />);
    expect(screen.getByText('All Prompts (Global)')).toBeInTheDocument();
    expect(screen.getByText('Team-Specific Prompts')).toBeInTheDocument();
    expect(screen.getByText('Selected Prompts (1)')).toBeInTheDocument();
  });

  it('shows team selection when team scope is selected', () => {
    render(<PromptExportDialog {...defaultProps} />);
    
    const teamRadio = screen.getByLabelText('Team-Specific Prompts');
    fireEvent.click(teamRadio);
    
    expect(screen.getByText('Select Team')).toBeInTheDocument();
  });

  it('displays export preview with correct counts', () => {
    render(<PromptExportDialog {...defaultProps} />);
    expect(screen.getByText('Export Preview')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Prompt count
  });

  it('shows export options checkboxes', () => {
    render(<PromptExportDialog {...defaultProps} />);
    expect(screen.getByText('Include team assignments')).toBeInTheDocument();
    expect(screen.getByText('Include usage statistics (coming soon)')).toBeInTheDocument();
  });
});

describe('PromptImportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    teams: mockTeams,
    currentUserId: 'user-1',
    onImportComplete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders import dialog with correct title', () => {
    render(<PromptImportDialog {...defaultProps} />);
    expect(screen.getByText('Upload Import File')).toBeInTheDocument();
  });

  it('shows target team selection', () => {
    render(<PromptImportDialog {...defaultProps} />);
    expect(screen.getByText('Target Team (Optional)')).toBeInTheDocument();
  });

  it('shows file upload area', () => {
    render(<PromptImportDialog {...defaultProps} />);
    expect(screen.getByText('Upload Import File')).toBeInTheDocument();
    expect(screen.getByText('Select a JSON file exported from Prompt Keeper')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('shows import instructions', () => {
    render(<PromptImportDialog {...defaultProps} />);
    expect(screen.getByText('Import files should be JSON exports from Prompt Keeper. The file will be validated before import.')).toBeInTheDocument();
  });

  it('has cancel button', () => {
    render(<PromptImportDialog {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});

describe('Import/Export Integration', () => {
  it('export dialog generates correct preview for selected prompts', () => {
    const props = {
      open: true,
      onOpenChange: jest.fn(),
      teams: mockTeams,
      prompts: mockPrompts,
      selectedPrompts: ['prompt-1'],
      currentUserId: 'user-1'
    };

    render(<PromptExportDialog {...props} />);
    
    // Select "Selected Prompts" option
    const selectedRadio = screen.getByLabelText('Selected Prompts (1)');
    fireEvent.click(selectedRadio);
    
    // Check preview shows correct count
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('export dialog shows team filter for team scope', () => {
    const props = {
      open: true,
      onOpenChange: jest.fn(),
      teams: mockTeams,
      prompts: mockPrompts,
      selectedPrompts: [],
      currentUserId: 'user-1'
    };

    render(<PromptExportDialog {...props} />);
    
    // Select team scope
    const teamRadio = screen.getByLabelText('Team-Specific Prompts');
    fireEvent.click(teamRadio);
    
    // Should show team selection
    expect(screen.getByText('Choose a team...')).toBeInTheDocument();
  });
});