"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  Undo2, 
  Calendar, 
  User, 
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from "lucide-react"
import { format } from "date-fns"

import { 
  listDeletionBackups,
  restoreDeletedPrompt,
  getDeletionBackup
} from "@/lib/db"
import { DeletionBackup } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

// DeletionBackup interface is now imported from types

interface PromptRollbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestoreComplete: (restoredPrompts: string[]) => void
}

export function PromptRollbackDialog({
  open,
  onOpenChange,
  onRestoreComplete
}: PromptRollbackDialogProps) {
  const [backups, setBackups] = useState<DeletionBackup[]>([])
  const [selectedBackups, setSelectedBackups] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restorationResults, setRestorationResults] = useState<{
    successful: string[]
    failed: { promptId: string; error: string }[]
  } | null>(null)

  // Load backups when dialog opens
  useEffect(() => {
    if (open) {
      loadBackups()
    }
  }, [open])

  const loadBackups = async () => {
    setIsLoading(true)
    try {
      const backupList = await listDeletionBackups(50) // Get last 50 backups
      setBackups(backupList)
    } catch (error) {
      console.error('Failed to load deletion backups:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectBackup = (promptId: string, selected: boolean) => {
    if (selected) {
      setSelectedBackups(prev => [...prev, promptId])
    } else {
      setSelectedBackups(prev => prev.filter(id => id !== promptId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedBackups(backups.map(backup => backup.promptId))
    } else {
      setSelectedBackups([])
    }
  }

  const handleRestore = async () => {
    if (selectedBackups.length === 0) return
    
    setIsRestoring(true)
    const successful: string[] = []
    const failed: { promptId: string; error: string }[] = []

    for (const promptId of selectedBackups) {
      try {
        await restoreDeletedPrompt(promptId)
        successful.push(promptId)
      } catch (error) {
        failed.push({
          promptId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    setRestorationResults({ successful, failed })
    setIsRestoring(false)
    
    if (successful.length > 0) {
      onRestoreComplete(successful)
      // Refresh the backup list to remove restored items
      await loadBackups()
      setSelectedBackups([])
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  const getSharingBadgeVariant = (sharing: string) => {
    switch (sharing) {
      case 'global': return 'default'
      case 'team': return 'secondary'
      case 'private': return 'outline'
      default: return 'outline'
    }
  }

  const allSelected = selectedBackups.length === backups.length && backups.length > 0
  const someSelected = selectedBackups.length > 0 && selectedBackups.length < backups.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Undo2 className="h-5 w-5 text-blue-600" />
            <span>Restore Deleted Prompts</span>
          </DialogTitle>
          <DialogDescription>
            Select prompts to restore from recent deletions. Restored prompts will include their original team assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Results Alert */}
          {restorationResults && (
            <Alert variant={restorationResults.failed.length > 0 ? "destructive" : "default"}>
              {restorationResults.failed.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>Restoration Complete</AlertTitle>
              <AlertDescription>
                {restorationResults.successful.length > 0 && (
                  <div>Successfully restored {restorationResults.successful.length} prompt(s).</div>
                )}
                {restorationResults.failed.length > 0 && (
                  <div className="mt-2">
                    Failed to restore {restorationResults.failed.length} prompt(s):
                    <ul className="list-disc list-inside mt-1">
                      {restorationResults.failed.map((failure, index) => (
                        <li key={index} className="text-sm">
                          {failure.promptId}: {failure.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Loading deletion backups...</span>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {backups.length} backup(s) available
                  {selectedBackups.length > 0 && ` (${selectedBackups.length} selected)`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadBackups}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>

              {/* Backups Table */}
              {backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No deletion backups found
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all backups"
                            data-indeterminate={someSelected}
                          />
                        </TableHead>
                        <TableHead>Prompt</TableHead>
                        <TableHead>Sharing</TableHead>
                        <TableHead>Teams</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead>Deleted By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backups.map((backup) => {
                        const isSelected = selectedBackups.includes(backup.promptId)
                        
                        return (
                          <TableRow 
                            key={backup.promptId}
                            data-state={isSelected ? "selected" : undefined}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => 
                                  handleSelectBackup(backup.promptId, !!checked)
                                }
                                aria-label={`Select ${backup.promptData.title}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium">{backup.promptData.title}</div>
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {backup.promptData.content.substring(0, 100)}
                                  {backup.promptData.content.length > 100 && '...'}
                                </div>
                                {backup.promptData.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {backup.promptData.tags.slice(0, 3).map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {backup.promptData.tags.length > 3 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{backup.promptData.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getSharingBadgeVariant(backup.promptData.sharing)}>
                                {backup.promptData.sharing}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {backup.teamAssignments.length > 0 ? (
                                  <Badge variant="secondary">
                                    {backup.teamAssignments.length} team(s)
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {backup.promptData.usageCount || 0} times
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(backup.deletedAt)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm">
                                <User className="h-3 w-3" />
                                <span>{backup.deletedBy}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
          >
            Close
          </Button>
          <Button
            onClick={handleRestore}
            disabled={selectedBackups.length === 0 || isRestoring}
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Restoring...
              </>
            ) : (
              <>
                <Undo2 className="h-4 w-4 mr-2" />
                Restore {selectedBackups.length > 0 ? `${selectedBackups.length} ` : ''}Selected
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}