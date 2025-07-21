'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { Prompt, Team } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { TagManager } from './tag-manager';
import { 
  Eye, 
  Edit3, 
  Calendar, 
  User, 
  BarChart3, 
  Building, 
  Globe,
  Clock,
  Hash
} from 'lucide-react';

const promptFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.').max(100, 'Title cannot exceed 100 characters.'),
  content: z.string().min(20, 'Prompt content must be at least 20 characters.').max(5000, 'Content cannot exceed 5000 characters.'),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed.').optional(),
  software: z.string().optional(),
  sharing: z.enum(['private', 'team', 'global']),
  assignedTeams: z.array(z.string()).optional(),
});

type PromptFormValues = z.infer<typeof promptFormSchema>;

const softwareOptions = ['None', 'Gemini', 'ChatGPT', 'Claude', 'Midjourney', 'DALL-E', 'Other'];
const sharingOptions = [
  { value: 'private', label: 'Private', description: 'Only visible to you' },
  { value: 'team', label: 'Team', description: 'Visible to your team members' },
  { value: 'global', label: 'Global', description: 'Visible to everyone' }
] as const;

interface EditPromptDialogProps {
  children: React.ReactNode;
  prompt: Prompt;
  onUpdatePrompt: (prompt: Prompt) => void;
  teams?: Team[];
  availableTags?: string[];
  isLoading?: boolean;
  currentUserId?: string;
}

export function EditPromptDialog({ 
  children, 
  prompt, 
  onUpdatePrompt, 
  teams = [], 
  availableTags = [],
  isLoading = false,
  currentUserId
}: EditPromptDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('edit');
  const { toast } = useToast();

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptFormSchema),
    defaultValues: {
      title: prompt.title,
      content: prompt.content,
      tags: prompt.tags || [],
      software: prompt.software || 'None',
      sharing: prompt.sharing,
      assignedTeams: prompt.assignedTeams || [],
    },
  });

  const watchedContent = form.watch('content');
  const watchedTitle = form.watch('title');
  const watchedSharing = form.watch('sharing');

  const onSubmit = (data: PromptFormValues) => {
    const newTags = data.tags || [];
    const newSoftware = data.software === 'None' ? undefined : data.software;

    const updatedPrompt: Prompt = { 
      ...prompt, 
      title: data.title,
      content: data.content,
      tags: newTags,
      software: newSoftware,
      sharing: data.sharing,
      assignedTeams: data.assignedTeams || [],
      lastModified: new Date().toISOString(),
      modifiedBy: currentUserId || prompt.createdBy,
    };

    onUpdatePrompt(updatedPrompt);
    toast({
      title: 'Prompt Updated',
      description: `"${data.title}" has been saved.`,
    });
    setOpen(false);
  };
  
  React.useEffect(() => {
    if (open) {
      form.reset({
        title: prompt.title,
        content: prompt.content,
        tags: prompt.tags || [],
        software: prompt.software || 'None',
        sharing: prompt.sharing,
        assignedTeams: prompt.assignedTeams || [],
      });
      setActiveTab('edit');
    }
  }, [open, prompt, form]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.name || `Team ${teamId}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Edit Prompt
          </DialogTitle>
          <DialogDescription>
            Make changes to your prompt and manage its settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit3 className="h-4 w-4" />
              Edit
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            <TabsContent value="edit" className="space-y-4 mt-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Basic Information */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Generate Marketing Copy" 
                                {...field} 
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prompt Content</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Enter the full prompt text here..."
                                className="min-h-[120px] font-mono text-sm"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormDescription>
                              {field.value?.length || 0} / 5000 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="software"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Software / LLM</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a software..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {softwareOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Tags */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Tags
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <TagManager
                                tags={field.value || []}
                                availableTags={availableTags}
                                onTagsChange={field.onChange}
                                placeholder="Add tags (e.g., marketing, ad copy, social media)"
                                maxTags={10}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormDescription>
                              Add relevant tags to help categorize and find this prompt.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Sharing & Team Assignment */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Sharing & Team Assignment
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="sharing"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sharing Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select sharing level..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sharingOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      {option.value === 'private' && <User className="h-4 w-4" />}
                                      {option.value === 'team' && <Building className="h-4 w-4" />}
                                      {option.value === 'global' && <Globe className="h-4 w-4" />}
                                      <div>
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-xs text-muted-foreground">{option.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {watchedSharing === 'team' && teams.length > 0 && (
                        <FormField
                          control={form.control}
                          name="assignedTeams"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assigned Teams</FormLabel>
                              <FormDescription>
                                Select which teams can access this prompt.
                              </FormDescription>
                              <div className="space-y-2">
                                {teams.map((team) => (
                                  <div key={team.id} className="flex items-center space-x-2">
                                    <Switch
                                      checked={field.value?.includes(team.id) || false}
                                      onCheckedChange={(checked) => {
                                        const currentTeams = field.value || [];
                                        if (checked) {
                                          field.onChange([...currentTeams, team.id]);
                                        } else {
                                          field.onChange(currentTeams.filter(id => id !== team.id));
                                        }
                                      }}
                                      disabled={isLoading}
                                    />
                                    <div className="flex items-center gap-2">
                                      <Building className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-sm">{team.name}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {team.members.length} members
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4 mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Prompt Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{watchedTitle || 'Untitled Prompt'}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      {form.watch('tags')?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Content:</h4>
                    <div className="bg-muted/50 p-4 rounded-lg border">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {watchedContent || 'No content yet...'}
                      </pre>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Software:</span> {form.watch('software') || 'None'}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Sharing:</span>
                      {watchedSharing === 'private' && <User className="h-4 w-4" />}
                      {watchedSharing === 'team' && <Building className="h-4 w-4" />}
                      {watchedSharing === 'global' && <Globe className="h-4 w-4" />}
                      {watchedSharing}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Usage Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Usage:</span>
                      <Badge variant="outline">{prompt.usageCount || 0}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Used:</span>
                      <span className="text-sm">{formatDate(prompt.lastUsed)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Version:</span>
                      <Badge variant="outline">v{prompt.metadata?.version || 1}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <span className="text-sm">{formatDate(prompt.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Last Modified:</span>
                      <span className="text-sm">{formatDate(prompt.lastModified)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Modified By:</span>
                      <span className="text-sm">{prompt.modifiedBy || prompt.createdBy || 'Unknown'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {prompt.assignedTeams && prompt.assignedTeams.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Team Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {prompt.assignedTeams.map((teamId) => (
                        <div key={teamId} className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getTeamName(teamId)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={form.formState.isSubmitting || isLoading}
          >
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
