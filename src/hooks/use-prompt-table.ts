"use client"

import { useState, useCallback, useMemo } from "react"
import { Prompt, PromptUsageAnalytics } from "@/lib/types"

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

export interface PaginationConfig {
  page: number
  pageSize: number
  total: number
}

export interface UsePromptTableProps {
  prompts: Prompt[]
  promptAnalytics?: Record<string, PromptUsageAnalytics>
  initialFilters?: Partial<PromptFilters>
  initialSort?: Partial<SortConfig>
  initialPageSize?: number
}

export function usePromptTable({
  prompts,
  promptAnalytics = {},
  initialFilters = {},
  initialSort = {},
  initialPageSize = 25
}: UsePromptTableProps) {
  // State management
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const [filters, setFilters] = useState<PromptFilters>({
    search: '',
    tags: [],
    sharing: [],
    dateRange: null,
    createdBy: null,
    hasUsage: null,
    ...initialFilters
  })
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'lastModified',
    direction: 'desc',
    ...initialSort
  })
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: initialPageSize,
    total: 0
  })

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

      // Tags filter
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(filterTag => 
          prompt.tags.includes(filterTag)
        )
        if (!hasMatchingTag) return false
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

  // Update pagination total when filtered results change
  useMemo(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredAndSortedPrompts.length,
      page: Math.min(prev.page, Math.ceil(filteredAndSortedPrompts.length / prev.pageSize) || 1)
    }))
  }, [filteredAndSortedPrompts.length])

  // Get paginated results
  const paginatedPrompts = useMemo(() => {
    const startIndex = (pagination.page - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return filteredAndSortedPrompts.slice(startIndex, endIndex)
  }, [filteredAndSortedPrompts, pagination.page, pagination.pageSize])

  // Derived data
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>()
    prompts.forEach(prompt => {
      prompt.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [prompts])

  const availableUsers = useMemo(() => {
    const userSet = new Set<string>()
    prompts.forEach(prompt => {
      if (prompt.createdBy) userSet.add(prompt.createdBy)
      if (prompt.modifiedBy) userSet.add(prompt.modifiedBy)
    })
    return Array.from(userSet).sort()
  }, [prompts])

  // Event handlers
  const handlePromptSelect = useCallback((promptId: string, selected: boolean) => {
    setSelectedPrompts(prev => {
      if (selected) {
        return prev.includes(promptId) ? prev : [...prev, promptId]
      } else {
        return prev.filter(id => id !== promptId)
      }
    })
  }, [])

  const handlePromptSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedPrompts(paginatedPrompts.map(prompt => prompt.id))
    } else {
      setSelectedPrompts([])
    }
  }, [paginatedPrompts])

  const handleSort = useCallback((field: keyof Prompt | 'usageCount' | 'lastUsed') => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleFiltersChange = useCallback((newFilters: PromptFilters) => {
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page when filters change
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize, 
      page: 1 // Reset to first page when page size changes
    }))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedPrompts([])
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      tags: [],
      sharing: [],
      dateRange: null,
      createdBy: null,
      hasUsage: null
    })
  }, [])

  const selectAllFiltered = useCallback(() => {
    setSelectedPrompts(filteredAndSortedPrompts.map(prompt => prompt.id))
  }, [filteredAndSortedPrompts])

  return {
    // Data
    prompts: paginatedPrompts,
    allPrompts: filteredAndSortedPrompts,
    selectedPrompts,
    filters,
    sortConfig,
    pagination: {
      ...pagination,
      onPageChange: handlePageChange,
      onPageSizeChange: handlePageSizeChange
    },
    availableTags,
    availableUsers,
    
    // Computed values
    totalPrompts: prompts.length,
    filteredCount: filteredAndSortedPrompts.length,
    selectedCount: selectedPrompts.length,
    allSelected: selectedPrompts.length === paginatedPrompts.length && paginatedPrompts.length > 0,
    someSelected: selectedPrompts.length > 0 && selectedPrompts.length < paginatedPrompts.length,
    
    // Event handlers
    onPromptSelect: handlePromptSelect,
    onPromptSelectAll: handlePromptSelectAll,
    onSort: handleSort,
    onFiltersChange: handleFiltersChange,
    
    // Utility functions
    clearSelection,
    clearFilters,
    selectAllFiltered
  }
}