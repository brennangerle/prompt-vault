"use client"

import { useState } from "react"
import { PromptTable } from "./prompt-table"
import { usePromptTable } from "@/hooks/use-prompt-table"
import { Prompt, PromptUsageAnalytics } from "@/lib/types"

// Mock data for demonstration
const mockPrompts: Prompt[] = [
  {
    id: '1',
    title: 'Customer Support Response Template',
    content: 'You are a helpful customer support representative. Please respond to the customer inquiry with empathy and provide clear, actionable solutions. Always maintain a professional and friendly tone.',
    tags: ['customer-support', 'template', 'professional'],
    sharing: 'global',
    createdBy: 'admin@company.com',
    teamId: 'team-1',
    createdAt: '2024-01-15T10:30:00Z',
    lastModified: '2024-01-20T14:45:00Z',
    modifiedBy: 'manager@company.com',
    usageCount: 45,
    lastUsed: '2024-01-25T09:15:00Z',
    assignedTeams: ['team-1', 'team-2']
  },
  {
    id: '2',
    title: 'Code Review Guidelines',
    content: 'When reviewing code, focus on: 1) Code clarity and readability, 2) Performance implications, 3) Security considerations, 4) Test coverage, 5) Documentation quality. Provide constructive feedback with specific examples.',
    tags: ['code-review', 'development', 'guidelines'],
    sharing: 'team',
    createdBy: 'tech-lead@company.com',
    teamId: 'team-dev',
    createdAt: '2024-01-10T16:20:00Z',
    lastModified: '2024-01-22T11:30:00Z',
    modifiedBy: 'senior-dev@company.com',
    usageCount: 23,
    lastUsed: '2024-01-24T15:45:00Z',
    assignedTeams: ['team-dev']
  },
  {
    id: '3',
    title: 'Marketing Copy Generator',
    content: 'Create compelling marketing copy that: highlights key benefits, addresses customer pain points, includes a clear call-to-action, maintains brand voice consistency, and optimizes for the target audience demographics.',
    tags: ['marketing', 'copywriting', 'conversion'],
    sharing: 'team',
    createdBy: 'marketing@company.com',
    teamId: 'team-marketing',
    createdAt: '2024-01-08T09:00:00Z',
    lastModified: '2024-01-18T13:20:00Z',
    modifiedBy: 'content-manager@company.com',
    usageCount: 67,
    lastUsed: '2024-01-25T16:30:00Z',
    assignedTeams: ['team-marketing', 'team-sales']
  },
  {
    id: '4',
    title: 'Data Analysis Report Template',
    content: 'Structure your data analysis report with: Executive Summary, Methodology, Key Findings, Data Visualizations, Insights and Recommendations, Limitations, and Next Steps. Use clear, non-technical language for stakeholders.',
    tags: ['data-analysis', 'reporting', 'business-intelligence'],
    sharing: 'private',
    createdBy: 'analyst@company.com',
    teamId: 'team-analytics',
    createdAt: '2024-01-12T14:15:00Z',
    lastModified: '2024-01-19T10:45:00Z',
    modifiedBy: 'analyst@company.com',
    usageCount: 12,
    lastUsed: '2024-01-23T08:20:00Z',
    assignedTeams: ['team-analytics']
  },
  {
    id: '5',
    title: 'Meeting Agenda Template',
    content: 'Effective meeting agenda should include: Meeting objective, Attendee list, Time allocations, Discussion topics with owners, Decision points, Action items template, and follow-up schedule.',
    tags: ['meetings', 'productivity', 'template'],
    sharing: 'global',
    createdBy: 'operations@company.com',
    createdAt: '2024-01-05T11:00:00Z',
    lastModified: '2024-01-21T15:10:00Z',
    modifiedBy: 'operations@company.com',
    usageCount: 89,
    lastUsed: '2024-01-25T14:00:00Z',
    assignedTeams: ['team-1', 'team-2', 'team-dev', 'team-marketing']
  },
  {
    id: '6',
    title: 'Unused Test Prompt',
    content: 'This is a test prompt that has never been used to demonstrate filtering by usage.',
    tags: ['test', 'unused'],
    sharing: 'private',
    createdBy: 'tester@company.com',
    createdAt: '2024-01-01T12:00:00Z',
    usageCount: 0,
    lastUsed: null
  }
]

const mockAnalytics: Record<string, PromptUsageAnalytics> = {
  '1': {
    totalUsage: 45,
    lastUsed: '2024-01-25T09:15:00Z',
    usageByTeam: { 'team-1': 25, 'team-2': 20 },
    usageByUser: { 'user1@company.com': 30, 'user2@company.com': 15 },
    usageTrend: [
      { date: '2024-01-20', count: 5 },
      { date: '2024-01-21', count: 8 },
      { date: '2024-01-22', count: 12 },
      { date: '2024-01-23', count: 10 },
      { date: '2024-01-24', count: 7 },
      { date: '2024-01-25', count: 3 }
    ]
  },
  '3': {
    totalUsage: 67,
    lastUsed: '2024-01-25T16:30:00Z',
    usageByTeam: { 'team-marketing': 45, 'team-sales': 22 },
    usageByUser: { 'marketer1@company.com': 40, 'sales1@company.com': 27 },
    usageTrend: [
      { date: '2024-01-20', count: 8 },
      { date: '2024-01-21', count: 12 },
      { date: '2024-01-22', count: 15 },
      { date: '2024-01-23', count: 18 },
      { date: '2024-01-24', count: 10 },
      { date: '2024-01-25', count: 4 }
    ]
  },
  '5': {
    totalUsage: 89,
    lastUsed: '2024-01-25T14:00:00Z',
    usageByTeam: { 'team-1': 30, 'team-2': 25, 'team-dev': 20, 'team-marketing': 14 },
    usageByUser: { 'manager1@company.com': 35, 'lead1@company.com': 30, 'user3@company.com': 24 },
    usageTrend: [
      { date: '2024-01-20', count: 12 },
      { date: '2024-01-21', count: 15 },
      { date: '2024-01-22', count: 18 },
      { date: '2024-01-23', count: 22 },
      { date: '2024-01-24', count: 16 },
      { date: '2024-01-25', count: 6 }
    ]
  }
}

export function PromptTableDemo() {
  const {
    prompts,
    selectedPrompts,
    filters,
    sortConfig,
    pagination,
    availableTags,
    availableUsers,
    onPromptSelect,
    onPromptSelectAll,
    onSort,
    onFiltersChange,
    clearSelection,
    clearFilters
  } = usePromptTable({
    prompts: mockPrompts,
    promptAnalytics: mockAnalytics,
    initialPageSize: 10
  })

  const [viewedPrompt, setViewedPrompt] = useState<Prompt | null>(null)
  const [editedPrompt, setEditedPrompt] = useState<Prompt | null>(null)

  const handlePromptView = (prompt: Prompt) => {
    setViewedPrompt(prompt)
    console.log('Viewing prompt:', prompt.title)
  }

  const handlePromptEdit = (prompt: Prompt) => {
    setEditedPrompt(prompt)
    console.log('Editing prompt:', prompt.title)
  }

  const handlePromptDelete = (promptId: string) => {
    const prompt = mockPrompts.find(p => p.id === promptId)
    if (prompt && window.confirm(`Are you sure you want to delete "${prompt.title}"?`)) {
      console.log('Deleting prompt:', promptId)
      // In a real app, this would call an API to delete the prompt
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Enhanced Prompt Table Demo</h1>
        <p className="text-muted-foreground">
          This demo showcases the enhanced prompt table component with sorting, filtering, 
          multi-select, and usage analytics features.
        </p>
      </div>

      {/* Action Bar */}
      {selectedPrompts.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedPrompts.length} prompt{selectedPrompts.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => console.log('Bulk edit:', selectedPrompts)}
              className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Bulk Edit
            </button>
            <button
              onClick={() => console.log('Bulk delete:', selectedPrompts)}
              className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
            >
              Bulk Delete
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex space-x-2">
        <button
          onClick={clearFilters}
          className="px-3 py-1 text-sm bg-outline border rounded hover:bg-accent"
        >
          Clear All Filters
        </button>
        <button
          onClick={() => onFiltersChange({ ...filters, hasUsage: true })}
          className="px-3 py-1 text-sm bg-outline border rounded hover:bg-accent"
        >
          Show Only Used Prompts
        </button>
        <button
          onClick={() => onFiltersChange({ ...filters, sharing: ['global'] })}
          className="px-3 py-1 text-sm bg-outline border rounded hover:bg-accent"
        >
          Show Only Global Prompts
        </button>
      </div>

      {/* Main Table */}
      <PromptTable
        prompts={prompts}
        selectedPrompts={selectedPrompts}
        onPromptSelect={onPromptSelect}
        onPromptSelectAll={onPromptSelectAll}
        onPromptEdit={handlePromptEdit}
        onPromptDelete={handlePromptDelete}
        onPromptView={handlePromptView}
        sortConfig={sortConfig}
        onSort={onSort}
        filters={filters}
        onFiltersChange={onFiltersChange}
        promptAnalytics={mockAnalytics}
        availableTags={availableTags}
        availableUsers={availableUsers}
        pagination={pagination}
      />

      {/* Debug Info */}
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">Debug Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Total Prompts:</strong> {mockPrompts.length}
          </div>
          <div>
            <strong>Filtered Prompts:</strong> {prompts.length}
          </div>
          <div>
            <strong>Selected Prompts:</strong> {selectedPrompts.length}
          </div>
          <div>
            <strong>Current Sort:</strong> {sortConfig.field} ({sortConfig.direction})
          </div>
          <div>
            <strong>Active Filters:</strong> {
              [
                filters.search && 'search',
                filters.tags.length > 0 && `${filters.tags.length} tags`,
                filters.sharing.length > 0 && `${filters.sharing.length} sharing`,
                filters.createdBy && 'user',
                filters.hasUsage !== null && 'usage'
              ].filter(Boolean).join(', ') || 'none'
            }
          </div>
          <div>
            <strong>Available Tags:</strong> {availableTags.length}
          </div>
        </div>
      </div>

      {/* Simple Modal for Viewing Prompts */}
      {viewedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{viewedPrompt.title}</h2>
              <button
                onClick={() => setViewedPrompt(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <strong>Content:</strong>
                <p className="mt-1 p-3 bg-gray-50 rounded">{viewedPrompt.content}</p>
              </div>
              <div>
                <strong>Tags:</strong> {viewedPrompt.tags.join(', ')}
              </div>
              <div>
                <strong>Sharing:</strong> {viewedPrompt.sharing}
              </div>
              <div>
                <strong>Usage Count:</strong> {viewedPrompt.usageCount || 0}
              </div>
              <div>
                <strong>Created:</strong> {viewedPrompt.createdAt}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}