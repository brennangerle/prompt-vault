'use client';

import * as React from 'react';
import { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export interface TagManagerProps {
  tags: string[];
  availableTags?: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  allowCustomTags?: boolean;
  className?: string;
  disabled?: boolean;
}

export function TagManager({
  tags,
  availableTags = [],
  onTagsChange,
  placeholder = "Add tags...",
  maxTags,
  allowCustomTags = true,
  className,
  disabled = false
}: TagManagerProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validate tag format
  const validateTag = (tag: string): { isValid: boolean; error?: string } => {
    const trimmedTag = tag.trim();
    
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
    if (tags.some(existingTag => existingTag.toLowerCase() === trimmedTag.toLowerCase())) {
      return { isValid: false, error: 'Tag already exists' };
    }
    
    // Check max tags limit
    if (maxTags && tags.length >= maxTags) {
      return { isValid: false, error: `Maximum ${maxTags} tags allowed` };
    }
    
    return { isValid: true };
  };

  // Add a new tag
  const addTag = (tagToAdd: string) => {
    const validation = validateTag(tagToAdd);
    if (!validation.isValid) {
      return validation.error;
    }
    
    const normalizedTag = tagToAdd.trim().toLowerCase();
    const newTags = [...tags, normalizedTag];
    onTagsChange(newTags);
    setInputValue('');
    return null;
  };

  // Remove a tag
  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    onTagsChange(newTags);
  };

  // Handle input key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    switch (e.key) {
      case 'Enter':
      case ',':
      case ';':
        e.preventDefault();
        if (inputValue.trim()) {
          const error = addTag(inputValue);
          if (error) {
            // Could show toast or error state here
            console.warn('Tag validation error:', error);
          }
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
    }
  };

  // Filter available tags based on input and existing tags
  const filteredAvailableTags = availableTags.filter(tag => 
    !tags.includes(tag) && 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Handle selecting a tag from suggestions
  const selectTag = (tag: string) => {
    const error = addTag(tag);
    if (error) {
      console.warn('Tag validation error:', error);
    }
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Display existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <TagIcon className="h-3 w-3 mr-1" />
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:text-destructive focus:outline-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Tag input with autocomplete */}
      {!disabled && (!maxTags || tags.length < maxTags) && (
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
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                onClick={() => {
                  if (inputValue.trim()) {
                    const error = addTag(inputValue);
                    if (error) {
                      console.warn('Tag validation error:', error);
                    }
                  }
                }}
                disabled={!inputValue.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </PopoverTrigger>
          
          {(filteredAvailableTags.length > 0 || (allowCustomTags && inputValue.trim())) && (
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandList>
                  {filteredAvailableTags.length > 0 && (
                    <CommandGroup heading="Suggested Tags">
                      {filteredAvailableTags.map((tag) => (
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
                  
                  {allowCustomTags && inputValue.trim() && !filteredAvailableTags.includes(inputValue.trim()) && (
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
                  
                  {filteredAvailableTags.length === 0 && (!allowCustomTags || !inputValue.trim()) && (
                    <CommandEmpty>No tags found.</CommandEmpty>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          )}
        </Popover>
      )}

      {/* Tag count and limit display */}
      {maxTags && (
        <div className="text-xs text-muted-foreground">
          {tags.length} / {maxTags} tags
        </div>
      )}
    </div>
  );
}