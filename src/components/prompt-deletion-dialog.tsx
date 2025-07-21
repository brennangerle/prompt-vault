"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { 
  AlertTriangle, 
  Users, 
  User, 
  Calendar, 
  BarChart3, 
  Trash2, 
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { format } from "date-fns"

import { 
  analyzePromptDeletionImpact, 
  analyzeBulkPromptDeletionImpact,
  deletePromptWithCascade,
  bulkDeletePromptsWithCascade
} from "@/lib/db"
import { Prompt, PromptDeletionImpact } from "@/lib/types"
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
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"

interface PromptDeletionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promptIds: string[]
  prompts?: Prompt[]
  onDeleteComplete: (successful: string[], failed: { promptId: string; error: string }[]) => void
}

export function PromptDeletionDialog({
  open,
  onOpenChange,
  promptIds,
  prompts = [],
  onDeleteComplete
}: PromptDeletionDialogProps) {
  const [impactAnalysis, setImpactAnalysis] = useState<{
    single?: PromptDeletionImpact
    bulk?: {
      impacts: PromptDeletionImpact[]
      totalImpactScore: number
      totalAffectedTeams: number
      totalAffectedUsers: number
      highImpactPrompts: string[]
      canDeleteAll: boolean
      warnings: string[]
    }
  }>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmationChecked, setConfirmationChecked] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [deletionProgress, setDeletionProgress] = useState(0)

  const isBulkDeletion = promptIds.length > 1

  // Load impact analysis when dialog opens
  useEffect(() => {
    if (open && promptIds.length > 0) {
      loadImpactAnalysis()
    }
  }, [open, promptIds])

  const loadImpactAnalysis = async () => {
    setIsAnalyzing(true)
    setConfirmationChecked(false)
    
    try {
      if (isBulkDeletion) {
        const analysis = await analyzeBulkPromptDeletionImpact(promptIds)
        setImpactAnalysis({ bulk: analysis })
      } else {
        const analysis = await analyzePromptDeletionImpact(promptIds[0])
        setImpactAnalysis({ single: analysis || undefined })
      }
    } catch (error) {
      console.error('Failed to analyze deletion impact:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmationChecked) return
    
    setIsDeleting(true)
    setDeletionProgress(0)
    
    try {
      if (isBulkDeletion) {
        // Track progress for bulk deletion
        let completed = 0
        const total = promptIds.length
        
        const result = await bulkDeletePromptsWithCascade(promptIds)
        
        // Simulate progress updates (in real implementation, you'd get these from the bulk function)
        const progressInterval = setInterval(() => {
          completed += 1
          setDeletionProgress((completed / total) * 100)
          if (completed >= total) {
            clearInterval(progressInterval)
          }
        }, 100)
        
        setTimeout(() => {
          clearInterval(progressInterval)
          setDeletionProgress(100)
          onDeleteComplete(result.successful, result.failed)
          onOpenChange(false)
        }, total * 100 + 500)
      } else {
        await deletePromptWithCascade(promptIds[0])
        setDeletionProgress(100)
        onDeleteComplete([promptIds[0]], [])
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to delete prompt(s):', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      onDeleteComplete([], [{ promptId: promptIds[0], error: errorMessage }])
      onOpenChange(false)
    } finally {
      setIsDeleting(false)
      setDeletionProgress(0)
    }
  }

  const getImpactSeverity = (score: number) => {
    if (score >= 100) return { level: 'high', color: 'destructive' }
    if (score >= 50) return { level: 'medium', color: 'warning' }
    return { level: 'low', color: 'default' }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never'
    try {
      return format(new Date(dateString), 'MMM d, yyyy HH:mm')
    } catch {
      return 'Invalid date'
    }
  }

  const renderSinglePromptAnalysis = (impact: PromptDeletionImpact) => {
    const severity = getImpactSeverity(impact.totalImpactScore)
    
    return (
      <div className="space-y-4">
        {/* Prompt Info */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">{impact.prompt.title}</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Sharing: <Badge variant="outline">{impact.prompt.sharing}</Badge></div>
            <div>Created: {formatDate(impact.prompt.createdAt)}</div>
            <div>Usage Count: {impact.usageAnalytics.totalUsage}</div>
            <div>Last Used: {formatDate(impact.usageAnalytics.lastUsed || undefined)}</div>
          </div>
        </div>

        {/* Impact Score */}
        <Alert variant={severity.color === 'destructive' ? 'destructive' : 'default'}>
          <BarChart3 className="h-4 w-4" />
          <AlertTitle>Impact Score: {impact.totalImpactScore}</AlertTitle>
          <AlertDescription>
            {severity.level === 'high' && 'High impact - This deletion will significantly affect users and teams'}
            {severity.level === 'medium' && 'Medium impact - This deletion will moderately affect users and teams'}
            {severity.level === 'low' && 'Low impact - This deletion will have minimal effect'}
          </AlertDescription>
        </Alert>

        {/* Warnings */}
        {impact.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {impact.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Affected Teams and Users */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              {showDetails ? 'Hide' : 'Show'} Impact Details
              <div className="ml-2 flex items-center space-x-2">
                {impact.affectedTeams.length > 0 && (
                  <Badge variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    {impact.affectedTeams.length} teams
                  </Badge>
                )}
                {impact.affectedUsers.length > 0 && (
                  <Badge variant="secondary">
                    <User className="h-3 w-3 mr-1" />
                    {impact.affectedUsers.length} users
                  </Badge>
                )}
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            {/* Affected Teams */}
            {impact.affectedTeams.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Affected Teams ({impact.affectedTeams.length})
                </h5>
                <div className="space-y-2">
                  {impact.affectedTeams.map((team) => (
                    <div key={team.teamId} className="p-3 border rounded bg-muted/30">
                      <div className="font-medium">{team.teamName}</div>
                      <div className="text-sm text-muted-foreground">
                        {team.memberCount} members • Assigned {formatDate(team.assignment.assignedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Users */}
            {impact.affectedUsers.length > 0 && (
              <div>
                <h5 className="font-medium mb-2 flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Users with Usage History ({impact.affectedUsers.length})
                </h5>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {impact.affectedUsers.map((user) => (
                    <div key={user.userId} className="p-3 border rounded bg-muted/30">
                      <div className="font-medium">{user.userEmail}</div>
                      <div className="text-sm text-muted-foreground">
                        Used {user.usageCount} times • Last used {formatDate(user.lastUsed)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  const renderBulkAnalysis = (analysis: NonNullable<typeof impactAnalysis.bulk>) => {
    const severity = getImpactSeverity(analysis.totalImpactScore)
    
    return (
      <div className="space-y-4">
        {/* Summary */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Bulk Deletion Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Prompts to delete</div>
              <div className="font-medium">{analysis.impacts.length}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total impact score</div>
              <div className="font-medium">{analysis.totalImpactScore}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Affected teams</div>
              <div className="font-medium">{analysis.totalAffectedTeams}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Affected users</div>
              <div className="font-medium">{analysis.totalAffectedUsers}</div>
            </div>
          </div>
        </div>

        {/* Impact Score */}
        <Alert variant={severity.color === 'destructive' ? 'destructive' : 'default'}>
          <BarChart3 className="h-4 w-4" />
          <AlertTitle>Combined Impact Score: {analysis.totalImpactScore}</AlertTitle>
          <AlertDescription>
            {severity.level === 'high' && 'High impact - This bulk deletion will significantly affect users and teams'}
            {severity.level === 'medium' && 'Medium impact - This bulk deletion will moderately affect users and teams'}
            {severity.level === 'low' && 'Low impact - This bulk deletion will have minimal effect'}
          </AlertDescription>
        </Alert>

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warnings</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {analysis.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* High Impact Prompts */}
        {analysis.highImpactPrompts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>High Impact Prompts</AlertTitle>
            <AlertDescription>
              {analysis.highImpactPrompts.length} prompt(s) have high impact scores and should be reviewed carefully.
            </AlertDescription>
          </Alert>
        )}

        {/* Detailed breakdown */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              {showDetails ? 'Hide' : 'Show'} Detailed Breakdown
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="max-h-60 overflow-y-auto space-y-3">
              {analysis.impacts.map((impact) => (
                <div key={impact.promptId} className="p-3 border rounded bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{impact.prompt.title}</div>
                    <Badge variant={getImpactSeverity(impact.totalImpactScore).color === 'destructive' ? 'destructive' : 'secondary'}>
                      Score: {impact.totalImpactScore}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>Teams: {impact.affectedTeams.length} • Users: {impact.affectedUsers.length}</div>
                    <div>Usage: {impact.usageAnalytics.totalUsage} times</div>
                    {impact.warnings.length > 0 && (
                      <div className="text-destructive">⚠ {impact.warnings.length} warning(s)</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <span>
              {isBulkDeletion 
                ? `Delete ${promptIds.length} Prompts` 
                : 'Delete Prompt'
              }
            </span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone easily. Please review the impact analysis below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Analyzing deletion impact...</span>
            </div>
          ) : (
            <>
              {impactAnalysis.single && renderSinglePromptAnalysis(impactAnalysis.single)}
              {impactAnalysis.bulk && renderBulkAnalysis(impactAnalysis.bulk)}
              
              {/* Confirmation */}
              <Separator />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm-deletion"
                  checked={confirmationChecked}
                  onCheckedChange={setConfirmationChecked}
                />
                <label 
                  htmlFor="confirm-deletion" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I understand the impact and want to proceed with deletion
                </label>
              </div>
            </>
          )}

          {/* Deletion Progress */}
          {isDeleting && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {isBulkDeletion ? 'Deleting prompts...' : 'Deleting prompt...'}
                </span>
              </div>
              <Progress value={deletionProgress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!confirmationChecked || isAnalyzing || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {isBulkDeletion ? `Delete ${promptIds.length} Prompts` : 'Delete Prompt'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}