import { useState, useEffect, useMemo } from 'react';
import { ref, get, query, orderByChild } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { Prompt } from '@/lib/types';

export interface TagUsageStats {
  tag: string;
  count: number;
  prompts: string[]; // prompt IDs using this tag
}

export interface UseTagManagementOptions {
  teamId?: string;
  sharing?: 'private' | 'team' | 'global';
  minUsageCount?: number;
}

export function useTagManagement(options: UseTagManagementOptions = {}) {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagStats, setTagStats] = useState<TagUsageStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and analyze tags from prompts
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const promptsRef = ref(database, 'prompts');
        const snapshot = await get(promptsRef);

        if (!snapshot.exists()) {
          setAvailableTags([]);
          setTagStats([]);
          return;
        }

        const promptsData = snapshot.val();
        const prompts: Prompt[] = Object.keys(promptsData).map(promptId => ({
          id: promptId,
          ...promptsData[promptId]
        }));

        // Filter prompts based on options
        let filteredPrompts = prompts;

        if (options.teamId) {
          filteredPrompts = filteredPrompts.filter(p => 
            p.assignedTeams?.includes(options.teamId!) || p.teamId === options.teamId
          );
        }

        if (options.sharing) {
          filteredPrompts = filteredPrompts.filter(p => p.sharing === options.sharing);
        }

        // Collect and analyze tags
        const tagUsageMap = new Map<string, { count: number; prompts: string[] }>();

        filteredPrompts.forEach(prompt => {
          if (prompt.tags && Array.isArray(prompt.tags)) {
            prompt.tags.forEach(tag => {
              const normalizedTag = tag.toLowerCase().trim();
              if (normalizedTag) {
                const existing = tagUsageMap.get(normalizedTag) || { count: 0, prompts: [] };
                existing.count += 1;
                existing.prompts.push(prompt.id);
                tagUsageMap.set(normalizedTag, existing);
              }
            });
          }
        });

        // Convert to arrays and sort
        const stats: TagUsageStats[] = Array.from(tagUsageMap.entries())
          .map(([tag, data]) => ({
            tag,
            count: data.count,
            prompts: data.prompts
          }))
          .filter(stat => !options.minUsageCount || stat.count >= options.minUsageCount)
          .sort((a, b) => b.count - a.count);

        const tags = stats.map(stat => stat.tag);

        setAvailableTags(tags);
        setTagStats(stats);
      } catch (err) {
        console.error('Error fetching tags:', err);
        setError('Failed to load tags');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, [options.teamId, options.sharing, options.minUsageCount]);

  // Get popular tags (most used)
  const popularTags = useMemo(() => {
    return tagStats.slice(0, 10).map(stat => stat.tag);
  }, [tagStats]);

  // Get recent tags (from recently created/modified prompts)
  const getRecentTags = useMemo(() => {
    // This would require additional logic to track recent usage
    // For now, return the first few available tags
    return availableTags.slice(0, 5);
  }, [availableTags]);

  // Search tags with fuzzy matching
  const searchTags = (query: string): string[] => {
    if (!query.trim()) return availableTags;

    const queryLower = query.toLowerCase();
    return availableTags.filter(tag => 
      tag.toLowerCase().includes(queryLower)
    ).sort((a, b) => {
      // Prioritize exact matches and prefix matches
      const aStartsWith = a.toLowerCase().startsWith(queryLower);
      const bStartsWith = b.toLowerCase().startsWith(queryLower);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // Then sort by usage count
      const aStats = tagStats.find(s => s.tag === a);
      const bStats = tagStats.find(s => s.tag === b);
      const aCount = aStats?.count || 0;
      const bCount = bStats?.count || 0;
      
      return bCount - aCount;
    });
  };

  // Get tag suggestions based on existing tags
  const getTagSuggestions = (existingTags: string[]): string[] => {
    // Find tags that commonly appear together with the existing tags
    const suggestions = new Set<string>();
    
    existingTags.forEach(existingTag => {
      const stat = tagStats.find(s => s.tag === existingTag);
      if (stat) {
        // Find other prompts that use this tag and collect their tags
        stat.prompts.forEach(promptId => {
          // This would require additional data structure to efficiently find prompts by ID
          // For now, suggest popular tags that aren't already selected
          popularTags.forEach(popularTag => {
            if (!existingTags.includes(popularTag)) {
              suggestions.add(popularTag);
            }
          });
        });
      }
    });

    return Array.from(suggestions).slice(0, 5);
  };

  // Validate tag format and constraints
  const validateTag = (tag: string, existingTags: string[] = []): { isValid: boolean; error?: string } => {
    const trimmedTag = tag.trim().toLowerCase();
    
    if (!trimmedTag) {
      return { isValid: false, error: 'Tag cannot be empty' };
    }
    
    if (trimmedTag.length < 2) {
      return { isValid: false, error: 'Tag must be at least 2 characters long' };
    }
    
    if (trimmedTag.length > 30) {
      return { isValid: false, error: 'Tag cannot exceed 30 characters' };
    }
    
    // Check for invalid characters
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(trimmedTag)) {
      return { isValid: false, error: 'Tag can only contain letters, numbers, spaces, hyphens, and underscores' };
    }
    
    // Check for duplicate
    if (existingTags.some(existingTag => existingTag.toLowerCase() === trimmedTag)) {
      return { isValid: false, error: 'Tag already exists' };
    }
    
    return { isValid: true };
  };

  // Normalize tags (lowercase, trim, deduplicate)
  const normalizeTags = (tags: string[]): string[] => {
    const normalized = tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0);
    
    // Remove duplicates while preserving order
    return Array.from(new Set(normalized));
  };

  return {
    availableTags,
    tagStats,
    popularTags,
    recentTags: getRecentTags,
    isLoading,
    error,
    searchTags,
    getTagSuggestions,
    validateTag,
    normalizeTags
  };
}