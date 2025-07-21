'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TagManager } from './tag-manager';
import { TagInput } from './tag-input';
import { TagFilter } from './tag-filter';
import { Badge } from '@/components/ui/badge';

export function TagManagementDemo() {
  const [basicTags, setBasicTags] = useState<string[]>(['react', 'typescript']);
  const [advancedTags, setAdvancedTags] = useState<string[]>(['javascript', 'frontend']);
  const [filterTags, setFilterTags] = useState<string[]>([]);

  // Mock available tags for demonstration
  const mockAvailableTags = [
    'react', 'typescript', 'javascript', 'frontend', 'backend',
    'nodejs', 'python', 'api', 'database', 'ui', 'ux', 'design',
    'testing', 'deployment', 'docker', 'aws', 'firebase', 'nextjs'
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Tag Management System Demo</h2>
        <p className="text-muted-foreground">
          Demonstration of the enhanced tag management components with validation, autocomplete, and filtering.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Tag Manager */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Tag Manager</CardTitle>
            <CardDescription>
              Simple tag management with validation and duplicate prevention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagManager
              tags={basicTags}
              availableTags={mockAvailableTags}
              onTagsChange={setBasicTags}
              placeholder="Add basic tags..."
              maxTags={5}
              allowCustomTags={true}
            />
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Current Tags:</h4>
              <div className="flex flex-wrap gap-1">
                {basicTags.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Tag Input */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Tag Input</CardTitle>
            <CardDescription>
              Enhanced tag input with suggestions and popular tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagInput
              tags={advancedTags}
              onTagsChange={setAdvancedTags}
              placeholder="Add advanced tags..."
              maxTags={8}
              allowCustomTags={true}
              showSuggestions={true}
              showPopularTags={true}
            />
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Current Tags:</h4>
              <div className="flex flex-wrap gap-1">
                {advancedTags.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Tag Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Tag Filter</CardTitle>
          <CardDescription>
            Filter interface for selecting multiple tags with search and popular tags
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagFilter
            selectedTags={filterTags}
            onTagsChange={setFilterTags}
            placeholder="Filter by tags..."
            maxTags={5}
          />
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Selected Filter Tags:</h4>
            <div className="flex flex-wrap gap-1">
              {filterTags.length > 0 ? (
                filterTags.map(tag => (
                  <Badge key={tag} variant="default">{tag}</Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">No tags selected</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Features Implemented</CardTitle>
          <CardDescription>
            Summary of tag management system capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Tag Validation</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Minimum 2 characters</li>
                <li>• Maximum 30 characters</li>
                <li>• Alphanumeric + spaces, hyphens, underscores</li>
                <li>• Duplicate prevention</li>
                <li>• Case-insensitive normalization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">User Experience</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Autocomplete with available tags</li>
                <li>• Popular tags suggestions</li>
                <li>• Keyboard shortcuts (Enter, comma, semicolon)</li>
                <li>• Visual feedback and error messages</li>
                <li>• Tag count limits</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Search & Filter</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fuzzy search matching</li>
                <li>• Tag-based filtering</li>
                <li>• Usage statistics display</li>
                <li>• Team and sharing context</li>
                <li>• Multi-tag selection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Integration</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Firebase database integration</li>
                <li>• Real-time tag suggestions</li>
                <li>• Team-specific tag management</li>
                <li>• Prompt table filtering</li>
                <li>• Edit dialog integration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}