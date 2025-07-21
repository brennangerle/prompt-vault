'use client';

import * as React from 'react';
import { useState } from 'react';
import { Check, X, Filter, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTagManagement } from '@/hooks/use-tag-management';

export interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  teamId?: string;
  sharing?: 'private' | 'team' | 'global';
  className?: string;
  placeholder?: string;
  maxTags?: number;
}

export function TagFilter({
  selectedTags,
  onTagsChange,
  teamId,
  sharing,
  className,
  placeholder = "Filter by tags...",
  maxTags = 5
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    availableTags,
    popularTags,
    searchTags,
    tagStats,
    isLoading
  } = useTagManagement({ teamId, sharing, minUsageCount: 1 });

  // Get filtered tags based on search
  const filteredTags = searchQuery 
    ? searchTags(searchQuery).filter(tag => !selectedTags.includes(tag))
    : availableTags.filter(tag => !selectedTags.includes(tag));

  // Get popular unselected tags
  const popularUnselected = popularTags.filter(tag => !selectedTags.includes(tag));

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else if (!maxTags || selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  // Clear all selected tags
  const clearAll = () => {
    onTagsChange([]);
  };

  // Get tag usage count for display
  const getTagCount = (tag: string) => {
    const stat = tagStats.find(s => s.tag === tag);
    return stat?.count || 0;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          {selectedTags.map((tag) => (
            <Badge key={tag} variant="default" className="text-xs">
              <Hash className="h-3 w-3 mr-1" />
              {tag}
              <button
                type="button"
                onClick={() => toggleTag(tag)}
                className="ml-1 hover:text-destructive focus:outline-none"
                aria-label={`Remove tag filter ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Tag filter popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-start text-left font-normal"
            disabled={isLoading}
          >
            <Filter className="h-4 w-4 mr-2" />
            {selectedTags.length > 0 ? (
              <span>{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''} selected</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {/* Popular tags section */}
              {!searchQuery && popularUnselected.length > 0 && (
                <>
                  <CommandGroup heading="Popular Tags">
                    {popularUnselected.slice(0, 8).map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => toggleTag(tag)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-2" />
                            {tag}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {getTagCount(tag)}
                            </span>
                            {selectedTags.includes(tag) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <Separator />
                </>
              )}

              {/* All tags section */}
              <CommandGroup heading={searchQuery ? "Search Results" : "All Tags"}>
                {filteredTags.slice(0, 20).map((tag) => (
                  <CommandItem
                    key={tag}
                    onSelect={() => toggleTag(tag)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        {tag}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {getTagCount(tag)}
                        </span>
                        {selectedTags.includes(tag) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>

              {/* Selected tags section */}
              {selectedTags.length > 0 && (
                <>
                  <Separator />
                  <CommandGroup heading="Selected Tags">
                    {selectedTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => toggleTag(tag)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <Hash className="h-4 w-4 mr-2" />
                            {tag}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              {getTagCount(tag)}
                            </span>
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Empty state */}
              {filteredTags.length === 0 && selectedTags.length === 0 && (
                <CommandEmpty>
                  {isLoading ? 'Loading tags...' : 'No tags found.'}
                </CommandEmpty>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Filter summary */}
      {selectedTags.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Showing prompts with {selectedTags.length > 1 ? 'any of these tags' : 'this tag'}
          {maxTags && selectedTags.length >= maxTags && (
            <span className="text-amber-600 ml-1">(max {maxTags} tags)</span>
          )}
        </div>
      )}
    </div>
  );
}