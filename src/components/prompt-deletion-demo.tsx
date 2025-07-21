"use client"

import * as React from "react"
import { useState } from "react"
import { Trash2, Undo2, RefreshCw } from "lucide-react"

import { Prompt } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PromptDeletionDialog } from "./prompt-deletion-dialog"
import { PromptRollbackDialog } from "./prompt-rollback-dialog"

// Mock data for demonstration
const mockPrompts: Prompt[] = [
  {
    id: "prompt-1",
    title: "Customer Service Response Template",
    content: "You are a helpful customer service representative. Please respond to the customer's inquiry with empathy and provide clear solutions. Always maintain a professional and friendly tone.",
    tags: ["customer-service", "template", "professional"],
    sharing: "team",
    createdBy: "user-1",
    teamId: "team-1",
    createdAt: "2024-01-15T10:00:00Z",
    lastModified: "2024-01-20T14:30:00Z",
    usageCount: 45,
    lastUsed: "2024-01-25T09:15:00Z",
    assignedTeams: ["team-1", "team-2"]
  },
  {
    id: "prompt-2",
    title: "Code Review Guidelines",
    content: "When reviewing code, focus on: 1) Code quality and readability, 2) Security vulnerabilities, 3) Performance implications, 4) Test coverage, 5) Documentation completeness.",
    tags: ["code-review", "development", "guidelines"],
    sharing: "global",
    createdBy: "user-2",
    createdAt: "2024-01-10T08:00:00Z",
    lastModified: "2024-01-22T16:45:00Z",
    usageCount: 128,
    lastUsed: "2024-01-26T11:30:00Z",
    assignedTeams: ["team-1", "team-3", "team-4"]
  },
  {
    id: "prompt-3",
    title: "Meeting Summary Template",
    content: "Please create a concise meeting summary including: Key decisions made, Action items with owners and deadlines, Important discussion points, Next meeting date and agenda items.",
    tags: ["meeting", "summary", "template"],
    sharing: "private",
    createdBy: "user-3",
    createdAt: "2024-01-12T12:00:00Z",
    usageCount: 12,
    lastUsed: "2024-01-24T15:20:00Z",
    assignedTeams: []
  }
]

export function PromptDeletionDemo() {
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false)
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [prompts, setPrompts] = useState<Prompt[]>(mockPrompts)

  const handlePromptSelect = (promptId: string, selected: boolean) => {
    if (selected) {
      setSelectedPrompts(prev => [...prev, promptId])
    } else {
      setSelectedPrompts(prev => prev.filter(id => id !== promptId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPrompts(prompts.map(p => p.id))
    } else {
      setSelectedPrompts([])
    }
  }

  const handleSingleDelete = (promptId: string) => {
    setSelectedPrompts([promptId])
    setDeletionDialogOpen(true)
  }

  const handleBulkDelete = () => {
    if (selectedPrompts.length > 0) {
      setDeletionDialogOpen(true)
    }
  }

  const handleDeletionComplete = (successful: string[], failed: { promptId: string; error: string }[]) => {
    // Remove successfully deleted prompts from the list
    setPrompts(prev => prev.filter(p => !successful.includes(p.id)))
    setSelectedPrompts([])
    
    console.log('Deletion completed:', { successful, failed })
  }

  const handleRestoreComplete = (restoredPrompts: string[]) => {
    console.log('Restored prompts:', restoredPrompts)
    // In a real app, you would refresh the prompts list here
  }

  const getSharingBadgeVariant = (sharing: string) => {
    switch (sharing) {
      case 'global': return 'default'
      case 'team': return 'secondary'
      case 'private': return 'outline'
      default: return 'outline'
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Prompt Deletion Demo</h1>
        <p className="text-muted-foreground">
          Test the enhanced prompt deletion functionality with impact analysis and rollback capabilities
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>
            Select prompts and test deletion functionality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => handleSelectAll(selectedPrompts.length !== prompts.length)}
            >
              {selectedPrompts.length === prompts.length ? 'Deselect All' : 'Select All'}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={selectedPrompts.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedPrompts.length})
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setRollbackDialogOpen(true)}
            >
              <Undo2 className="h-4 w-4 mr-2" />
              Restore Deleted
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setPrompts(mockPrompts)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Demo
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Selected: {selectedPrompts.length} of {prompts.length} prompts
          </div>
        </CardContent>
      </Card>

      {/* Prompts List */}
      <div className="grid gap-4">
        {prompts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No prompts available. Use "Reset Demo" to restore the sample data.</p>
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => {
            const isSelected = selectedPrompts.includes(prompt.id)
            
            return (
              <Card 
                key={prompt.id} 
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => handlePromptSelect(prompt.id, !isSelected)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{prompt.title}</h3>
                        <Badge variant={getSharingBadgeVariant(prompt.sharing)}>
                          {prompt.sharing}
                        </Badge>
                        {prompt.assignedTeams && prompt.assignedTeams.length > 0 && (
                          <Badge variant="outline">
                            {prompt.assignedTeams.length} team(s)
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prompt.content}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        {prompt.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Usage: {prompt.usageCount || 0}</span>
                        <span>Created: {new Date(prompt.createdAt || '').toLocaleDateString()}</span>
                        {prompt.lastUsed && (
                          <span>Last used: {new Date(prompt.lastUsed).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSingleDelete(prompt.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Deletion Dialog */}
      <PromptDeletionDialog
        open={deletionDialogOpen}
        onOpenChange={setDeletionDialogOpen}
        promptIds={selectedPrompts}
        prompts={prompts.filter(p => selectedPrompts.includes(p.id))}
        onDeleteComplete={handleDeletionComplete}
      />

      {/* Rollback Dialog */}
      <PromptRollbackDialog
        open={rollbackDialogOpen}
        onOpenChange={setRollbackDialogOpen}
        onRestoreComplete={handleRestoreComplete}
      />
    </div>
  )
}