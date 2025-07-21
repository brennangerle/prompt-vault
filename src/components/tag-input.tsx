'use client';

import * as React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Tag as TagIcon, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useTagManagement } from '@/hooks/use-tag-management';

export interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowCustomTags?: boolean;
  className?: string;
  disabled?: boolean;
  teamId?: string;
  sharing?: 'private' | 'team' | 'global';
  showSuggestions?: boolean;
  showPopularTags?: boolean;
}

export function TagInput({
  tags,
  onTagsChange,
  placeholder = "Add tags...",
  maxTags,
  allowCustomTags = true,
  className,
  disabled = false,
  teamId,
  sharing,
  showSuggestions = true,
  showPopularTags = true
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    availableTags,
    popularTags,
    searchTags,
    getTagSuggestions,
    validateTag,
    normalizeTags,
    isLoading
  } = useTagManagement({ teamId, sharing });

  // Clear error after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Add a new tag with validation
  const addTag = useCallback((tagToAdd: string) => {
    const validation = validateTag(tagToAdd, tags);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid tag');
      return false;
    }
    
    // Check max tags limit
    if (maxTags && tags.length >= maxTags) {
      setError(`Maximum ${maxTags} tags allowed`);
      return false;
    }
    
    const normalizedTag = tagToAdd.trim().toLowerCase();
    const newTags = normalizeTags([...tags, normalizedTag]);
    onTagsChange(newTags);
    setInputValue('');
    setError(null);
    return true;
  }, [tags, maxTags, onTagsChange, validateTag]);

  // Remove a tag
  const removeTag = useCallback((tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(newTags);
  }, [tags, onTagsChange]);

  // Handle input key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    switch (e.key) {
      case 'Enter':
      case ',':
      case ';':
        e.preventDefault();
        if (inputValue.trim()) {
          addTag(inputValue);
        }
        break;
      case 'Backspace':
        if (!inputValue && tags.length > 0) {
          removeTag(tags[tags.length - 1]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  // Get filtered suggestions based on input
  const getFilteredSuggestions = () => {
    if (!inputValue.trim()) {
      // Show popular tags and suggestions when no input
      const suggestions = showSuggestions ? getTagSuggestions(tags) : [];
      const popular = showPopularTags ? popularTags.filter(tag => !tags.includes(tag)) : [];
      
      return {
        suggestions: suggestions.slice(0, 5),
        popular: popular.slice(0, 8),
        search: []
      };
    }

    // Search for matching tags
    const searchResults = searchTags(inputValue).filter(tag => !tags.includes(tag));
    
    return {
      suggestions: [],
      popular: [],
      search: searchResults.slice(0, 10)
    };
  };

  const { suggestions, popular, search } = getFilteredSuggestions();

  // Handle selecting a tag from suggestions
  const selectTag = (tag: string) => {
    if (addTag(tag)) {
      setIsOpen(false);
    }
  };

  // Handle manual tag addition
  const handleAddClick = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const canAddMoreTags = !maxTags || tags.length < maxTags;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Display existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs group">
              <Hash className="h-3 w-3 mr-1" />
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 opacity-60 hover:opacity-100 hover:text-destructive focus:outline-none transition-opacity"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {/* Tag input with autocomplete */}
      {!disabled && canAddMoreTags && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                className={cn(
                  "pr-10",
                  error && "border-destructive focus-visible:ring-destructive"
                )}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={handleAddClick}
                disabled={!inputValue.trim() || isLoading}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </PopoverTrigger>
          
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandList>
                {/* Search results */}
                {search.length > 0 && (
                  <CommandGroup heading="Matching Tags">
                    {search.map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => selectTag(tag)}
                        className="cursor-pointer"
                      >
                        <TagIcon className="h-4 w-4 mr-2" />
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Suggestions based on existing tags */}
                {suggestions.length > 0 && (
                  <CommandGroup heading="Suggested Tags">
                    {suggestions.map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => selectTag(tag)}
                        className="cursor-pointer"
                      >
                        <Hash className="h-4 w-4 mr-2" />
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Popular tags */}
                {popular.length > 0 && (
                  <CommandGroup heading="Popular Tags">
                    {popular.map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => selectTag(tag)}
                        className="cursor-pointer"
                      >
                        <TagIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        {tag}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                
                {/* Create new tag option */}
                {allowCustomTags && inputValue.trim() && !search.includes(inputValue.trim().toLowerCase()) && (
                  <CommandGroup heading="Create New Tag">
                    <CommandItem
                      onSelect={() => selectTag(inputValue)}
                      className="cursor-pointer"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create "{inputValue.trim()}"
                    </CommandItem>
                  </CommandGroup>
                )}
                
                {/* Empty state */}
                {search.length === 0 && suggestions.length === 0 && popular.length === 0 && 
                 (!allowCustomTags || !inputValue.trim()) && (
                  <CommandEmpty>
                    {isLoading ? 'Loading tags...' : 'No tags found.'}
                  </CommandEmpty>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Tag count and limit display */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {tags.length} tag{tags.length !== 1 ? 's' : ''}
          {maxTags && ` / ${maxTags}`}
        </span>
        {!disabled && (
          <span className="text-xs">
            Press Enter, comma, or semicolon to add tags
          </span>
        )}
      </div>
    </div>
  );
}