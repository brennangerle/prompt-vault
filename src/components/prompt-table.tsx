"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import { 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Users,
  MoreHorizontal,
  CheckCircle,
  XCircle
} from "lucide-react"
import { format } from "date-fns"

import { Prompt, PromptUsageAnalytics } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { TagFilter } from "./tag-filter"
import { PromptDeletionDialog } from "./prompt-deletion-dialog"

export interface PromptFilters {
  search: string
  tags: string[]
  sharing: ('private' | 'team' | 'global')[]
  dateRange: { start: Date; end: Date } | null
  createdBy: string | null
  hasUsage: boolean | null
}

export interface SortConfig {
  field: keyof Prompt | 'usageCount' | 'lastUsed'
  direction: 'asc' | 'desc'
}

export interface PromptTableProps {
  prompts: Prompt[]
  selectedPrompts: string[]
  onPromptSelect: (promptId: string, selected: boolean) => void
  onPromptSelectAll: (selected: boolean) => void
  onPromptEdit: (prompt: Prompt) => void
  onPromptDelete: (promptId: string) => void
  onPromptView: (prompt: Prompt) => void
  onBulkDelete?: (promptIds: string[]) => void
  sortConfig: SortConfig
  onSort: (field: keyof Prompt | 'usageCount' | 'lastUsed') => void
  filters: PromptFilters
  onFiltersChange: (filters: PromptFilters) => void
  promptAnalytics?: Record<string, PromptUsageAnalytics>
  availableTags?: string[]
  availableUsers?: string[]
  isLoading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
}

export function PromptTable({
  prompts,
  selectedPrompts,
  onPromptSelect,
  onPromptSelectAll,
  onPromptEdit,
  onPromptDelete,
  onPromptView,
  onBulkDelete,
  sortConfig,
  onSort,
  filters,
  onFiltersChange,
  promptAnalytics = {},
  availableTags = [],
  availableUsers = [],
  isLoading = false,
  pagination
}: PromptTableProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false)
  const [promptsToDelete, setPromptsToDelete] = useState<string[]>([])
  const [deletionResults, setDeletionResults] = useState<{
    successful: string[]
    failed: { promptId: string; error: string }[]
  } | null>(null)

  // Filter and sort prompts
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = prompts.filter(prompt => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          prompt.title.toLowerCase().includes(searchLower) ||
          prompt.content.toLowerCase().includes(searchLower) ||
          prompt.tags.some(tag => tag.toLowerCase().includes(searchLower))
        if (!matchesSearch) return false
      }

      // Tags filter - improved to handle case-insensitive matching
      if (filters.tags.length > 0) {
        const promptTags = (prompt.tags || []).map(tag => tag.toLowerCase());
        const filterTags = filters.tags.map(tag => tag.toLowerCase());
        const hasMatchingTag = filterTags.some(filterTag => 
          promptTags.includes(filterTag)
        );
        if (!hasMatchingTag) return false;
      }

      // Sharing filter
      if (filters.sharing.length > 0) {
        if (!filters.sharing.includes(prompt.sharing)) return false
      }

      // Created by filter
      if (filters.createdBy && prompt.createdBy !== filters.createdBy) {
        return false
      }

      // Usage filter
      if (filters.hasUsage !== null) {
        const hasUsage = (prompt.usageCount || 0) > 0
        if (filters.hasUsage !== hasUsage) return false
      }

      // Date range filter
      if (filters.dateRange && prompt.createdAt) {
        const createdDate = new Date(prompt.createdAt)
        if (createdDate < filters.dateRange.start || createdDate > filters.dateRange.end) {
          return false
        }
      }

      return true
    })

    // Sort prompts
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortConfig.field) {
        case 'usageCount':
          aValue = a.usageCount || 0
          bValue = b.usageCount || 0
          break
        case 'lastUsed':
          aValue = a.lastUsed ? new Date(a.lastUsed).getTime() : 0
          bValue = b.lastUsed ? new Date(b.lastUsed).getTime() : 0
          break
        case 'createdAt':
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0
          break
        case 'lastModified':
          aValue = a.lastModified ? new Date(a.lastModified).getTime() : 0
          bValue = b.lastModified ? new Date(b.lastModified).getTime() : 0
          break
        default:
          aValue = a[sortConfig.field as keyof Prompt] || ''
          bValue = b[sortConfig.field as keyof Prompt] || ''
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [prompts, filters, sortConfig])

  const allSelected = selectedPrompts.length === filteredAndSortedPrompts.length && filteredAndSortedPrompts.length > 0
  const someSelected = selectedPrompts.length > 0 && selectedPrompts.length < filteredAndSortedPrompts.length

  const handleSelectAll = () => {
    onPromptSelectAll(!allSelected)
  }

  const handleSort = (field: keyof Prompt | 'usageCount' | 'lastUsed') => {
    onSort(field)
  }

  const handleSingleDelete = (promptId: string) => {
    setPromptsToDelete([promptId])
    setDeletionDialogOpen(true)
  }

  const handleBulkDelete = () => {
    if (selectedPrompts.length > 0) {
      setPromptsToDelete(selectedPrompts)
      setDeletionDialogOpen(true)
    }
  }

  const handleDeletionComplete = (successful: string[], failed: { promptId: string; error: string }[]) => {
    setDeletionResults({ successful, failed })
    
    // Call the original delete handlers for successful deletions
    successful.forEach(promptId => {
      onPromptDelete(promptId)
    })
    
    // Clear selection after bulk delete
    if (successful.length > 0) {
      onPromptSelectAll(false)
    }
    
    // Show results briefly
    setTimeout(() => {
      setDeletionResults(null)
    }, 5000)
  }

  const SortableHeader = ({ 
    field, 
    children, 
    className = "" 
  }: { 
    field: keyof Prompt | 'usageCount' | 'lastUsed'
    children: React.ReactNode
    className?: string 
  }) => (
    <TableHead className={`cursor-pointer select-none ${className}`} onClick={() => handleSort(field)}>
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortConfig.field === field && (
          sortConfig.direction === 'asc' ? 
            <ChevronUp className="h-4 w-4" /> : 
            <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  )

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never'
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
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

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search prompts by title, content, or tags..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>
        
        {/* Bulk Actions */}
        {selectedPrompts.length > 0 && onBulkDelete && (
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            className="flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete {selectedPrompts.length}</span>
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {(filters.tags.length > 0 || filters.sharing.length > 0 || filters.createdBy || filters.hasUsage !== null) && (
            <Badge variant="secondary" className="ml-2">
              {[
                filters.tags.length > 0 ? `${filters.tags.length} tags` : null,
                filters.sharing.length > 0 ? `${filters.sharing.length} sharing` : null,
                filters.createdBy ? '1 user' : null,
                filters.hasUsage !== null ? '1 usage' : null
              ].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
          {/* Tags Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tags</label>
            <TagFilter
              selectedTags={filters.tags}
              onTagsChange={(tags) => onFiltersChange({ ...filters, tags })}
              placeholder="Filter by tags..."
              maxTags={5}
            />
          </div>

          {/* Sharing Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Sharing</label>
            <Select
              value={filters.sharing.length > 0 ? filters.sharing[0] : ""}
              onValueChange={(value) => {
                const sharing = value as 'private' | 'team' | 'global'
                if (value && !filters.sharing.includes(sharing)) {
                  onFiltersChange({ ...filters, sharing: [...filters.sharing, sharing] })
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select sharing..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
            {filters.sharing.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {filters.sharing.map(sharing => (
                  <Badge key={sharing} variant="secondary" className="text-xs">
                    {sharing}
                    <button
                      onClick={() => onFiltersChange({ 
                        ...filters, 
                        sharing: filters.sharing.filter(s => s !== sharing) 
                      })}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Created By Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Created By</label>
            <Select
              value={filters.createdBy || ""}
              onValueChange={(value) => onFiltersChange({ ...filters, createdBy: value || null })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All users</SelectItem>
                {availableUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Usage Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Usage</label>
            <Select
              value={filters.hasUsage === null ? "" : filters.hasUsage.toString()}
              onValueChange={(value) => {
                const hasUsage = value === "" ? null : value === "true"
                onFiltersChange({ ...filters, hasUsage })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by usage..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All prompts</SelectItem>
                <SelectItem value="true">Used prompts</SelectItem>
                <SelectItem value="false">Unused prompts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Deletion Results */}
      {deletionResults && (
        <Alert variant={deletionResults.failed.length > 0 ? "destructive" : "default"}>
          {deletionResults.failed.length > 0 ? (
            <XCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertTitle>Deletion Complete</AlertTitle>
          <AlertDescription>
            {deletionResults.successful.length > 0 && (
              <div>Successfully deleted {deletionResults.successful.length} prompt(s).</div>
            )}
            {deletionResults.failed.length > 0 && (
              <div className="mt-2">
                Failed to delete {deletionResults.failed.length} prompt(s):
                <ul className="list-disc list-inside mt-1">
                  {deletionResults.failed.map((failure, index) => (
                    <li key={index} className="text-sm">
                      {failure.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredAndSortedPrompts.length} of {prompts.length} prompts
          {selectedPrompts.length > 0 && ` (${selectedPrompts.length} selected)`}
        </span>
        {pagination && (
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => pagination.onPageSizeChange(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all prompts"
                  data-indeterminate={someSelected}
                />
              </TableHead>
              <SortableHeader field="title" className="min-w-[200px]">Title</SortableHeader>
              <SortableHeader field="sharing">Sharing</SortableHeader>
              <TableHead>Tags</TableHead>
              <SortableHeader field="usageCount">Usage</SortableHeader>
              <SortableHeader field="lastUsed">Last Used</SortableHeader>
              <SortableHeader field="createdAt">Created</SortableHeader>
              <SortableHeader field="lastModified">Modified</SortableHeader>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading prompts...
                </TableCell>
              </TableRow>
            ) : filteredAndSortedPrompts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No prompts found matching your criteria
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedPrompts.map((prompt) => {
                const isSelected = selectedPrompts.includes(prompt.id)
                const analytics = promptAnalytics[prompt.id]
                
                return (
                  <TableRow 
                    key={prompt.id} 
                    data-state={isSelected ? "selected" : undefined}
                    className="group"
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onPromptSelect(prompt.id, !!checked)}
                        aria-label={`Select prompt ${prompt.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{prompt.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {prompt.content.substring(0, 100)}
                          {prompt.content.length > 100 && '...'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSharingBadgeVariant(prompt.sharing)}>
                        {prompt.sharing}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {prompt.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {prompt.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{prompt.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{prompt.usageCount || 0}</span>
                        {analytics && (
                          <div className="text-xs text-muted-foreground">
                            {Object.keys(analytics.usageByTeam).length > 0 && (
                              <div className="flex items-center">
                                <Users className="h-3 w-3 mr-1" />
                                {Object.keys(analytics.usageByTeam).length} teams
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(prompt.lastUsed || undefined)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(prompt.createdAt)}
                        {prompt.createdBy && (
                          <div className="text-xs text-muted-foreground">
                            by {prompt.createdBy}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(prompt.lastModified)}
                        {prompt.modifiedBy && (
                          <div className="text-xs text-muted-foreground">
                            by {prompt.modifiedBy}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onPromptView(prompt)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPromptEdit(prompt)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleSingleDelete(prompt.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.ceil(pagination.total / pagination.pageSize) }, (_, i) => i + 1)
                .filter(page => 
                  page === 1 || 
                  page === Math.ceil(pagination.total / pagination.pageSize) ||
                  Math.abs(page - pagination.page) <= 2
                )
                .map((page, index, array) => (
                  <React.Fragment key={page}>
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={page === pagination.page ? "default" : "outline"}
                      size="sm"
                      onClick={() => pagination.onPageChange(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  </React.Fragment>
                ))
              }
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Deletion Dialog */}
      <PromptDeletionDialog
        open={deletionDialogOpen}
        onOpenChange={setDeletionDialogOpen}
        promptIds={promptsToDelete}
        prompts={prompts.filter(p => promptsToDelete.includes(p.id))}
        onDeleteComplete={handleDeletionComplete}
      />
    </div>
  )
}