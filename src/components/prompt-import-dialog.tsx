'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Users,
  Eye
} from 'lucide-react';
import { validateImportData, previewImport, importPrompts } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';
import type { 
  Team, 
  PromptExportData, 
  ImportPreview, 
  ImportResult,
  ConflictResolution 
} from '@/lib/types';

interface PromptImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  currentUserId: string;
  onImportComplete?: (result: ImportResult) => void;
}

export function PromptImportDialog({
  open,
  onOpenChange,
  teams,
  currentUserId,
  onImportComplete
}: PromptImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'conflicts' | 'importing'>('upload');
  const [importData, setImportData] = useState<PromptExportData | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'skip' | 'overwrite' | 'create_new'>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetDialog = () => {
    setStep('upload');
    setImportData(null);
    setPreview(null);
    setTargetTeamId('');
    setConflictResolutions({});
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast({
        title: 'Invalid File Type',
        description: 'Please select a JSON file.',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const validation = await validateImportData(data);
      if (!validation.valid) {
        toast({
          title: 'Invalid Import File',
          description: `File validation failed: ${validation.errors[0]?.message}`,
          variant: 'destructive'
        });
        return;
      }

      setImportData(data);
      
      // Generate preview
      const importPreview = await previewImport(data, targetTeamId || undefined);
      setPreview(importPreview);
      
      // Initialize conflict resolutions
      const initialResolutions: Record<string, 'skip' | 'overwrite' | 'create_new'> = {};
      importPreview.conflictingPrompts.forEach(conflict => {
        initialResolutions[conflict.promptId] = 'skip';
      });
      setConflictResolutions(initialResolutions);
      
      setStep('preview');
    } catch (error) {
      toast({
        title: 'File Processing Error',
        description: error instanceof Error ? error.message : 'Failed to process the file',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewNext = () => {
    if (preview && preview.conflictingPrompts.length > 0) {
      setStep('conflicts');
    } else {
      handleImport();
    }
  };

  const handleConflictResolution = (promptId: string, resolution: 'skip' | 'overwrite' | 'create_new') => {
    setConflictResolutions(prev => ({
      ...prev,
      [promptId]: resolution
    }));
  };

  const handleImport = async () => {
    if (!importData) return;

    setStep('importing');
    setIsProcessing(true);

    try {
      const result = await importPrompts(importData, {
        conflictResolutions,
        targetTeamId: targetTeamId || undefined,
        importedBy: currentUserId
      });

      if (result.success) {
        toast({
          title: 'Import Successful',
          description: `Successfully imported ${result.imported} prompts`
        });
      } else {
        toast({
          title: 'Import Completed with Errors',
          description: `Imported ${result.imported} prompts, ${result.skipped} skipped, ${result.errors.length} errors`,
          variant: 'destructive'
        });
      }

      onImportComplete?.(result);
      onOpenChange(false);
      resetDialog();
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="team-select">Target Team (Optional)</Label>
        <Select value={targetTeamId} onValueChange={setTargetTeamId}>
          <SelectTrigger>
            <SelectValue placeholder="Import to specific team..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No specific team</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name} ({team.members.length} members)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          If selected, all imported prompts will be assigned to this team
        </p>
      </div>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Upload Import File</h3>
            <p className="text-muted-foreground">
              Select a JSON file exported from Prompt Keeper
            </p>
          </div>
          <Button 
            className="mt-4" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Choose File'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Import files should be JSON exports from Prompt Keeper. The file will be validated before import.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!preview) return null;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Import Preview
            </CardTitle>
            <CardDescription>
              Review what will be imported before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{preview.estimatedChanges.creates}</div>
                <div className="text-sm text-muted-foreground">New Prompts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{preview.estimatedChanges.updates}</div>
                <div className="text-sm text-muted-foreground">Conflicts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{preview.estimatedChanges.skips}</div>
                <div className="text-sm text-muted-foreground">Unchanged</div>
              </div>
            </div>

            {preview.teamsToAssign.length > 0 && (
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Teams to Assign</div>
                <div className="flex flex-wrap gap-1">
                  {preview.teamsToAssign.map((teamId) => {
                    const team = teams.find(t => t.id === teamId);
                    return (
                      <Badge key={teamId} variant="secondary">
                        <Users className="h-3 w-3 mr-1" />
                        {team?.name || teamId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {preview.invalidPrompts.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {preview.invalidPrompts.length} prompts have validation errors and will be skipped.
            </AlertDescription>
          </Alert>
        )}

        {preview.conflictingPrompts.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {preview.conflictingPrompts.length} prompts conflict with existing prompts. 
              You'll need to resolve these conflicts in the next step.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="new">New Prompts ({preview.newPrompts.length})</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts ({preview.conflictingPrompts.length})</TabsTrigger>
            <TabsTrigger value="errors">Errors ({preview.invalidPrompts.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="new" className="space-y-2">
            <ScrollArea className="h-48">
              {preview.newPrompts.map((prompt) => (
                <div key={prompt.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{prompt.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {prompt.sharing} • {prompt.tags?.length || 0} tags
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="conflicts" className="space-y-2">
            <ScrollArea className="h-48">
              {preview.conflictingPrompts.map((conflict) => (
                <div key={conflict.promptId} className="p-2 border rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{conflict.importedPrompt.title}</div>
                      <div className="text-sm text-muted-foreground">{conflict.reason}</div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="errors" className="space-y-2">
            <ScrollArea className="h-48">
              {preview.invalidPrompts.map((error, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium">{error.promptTitle || 'Unknown Prompt'}</div>
                    <div className="text-sm text-muted-foreground">{error.message}</div>
                  </div>
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderConflictsStep = () => {
    if (!preview) return null;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">Resolve Conflicts</h3>
          <p className="text-muted-foreground">
            Choose how to handle prompts that conflict with existing ones.
          </p>
        </div>

        <ScrollArea className="h-96">
          <div className="space-y-4">
            {preview.conflictingPrompts.map((conflict) => (
              <Card key={conflict.promptId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{conflict.importedPrompt.title}</CardTitle>
                  <CardDescription>{conflict.reason}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-muted-foreground">Existing</div>
                      <div>Modified: {conflict.existingPrompt.lastModified ? new Date(conflict.existingPrompt.lastModified).toLocaleDateString() : 'Unknown'}</div>
                      <div>Tags: {conflict.existingPrompt.tags?.length || 0}</div>
                    </div>
                    <div>
                      <div className="font-medium text-muted-foreground">Imported</div>
                      <div>Modified: {conflict.importedPrompt.lastModified ? new Date(conflict.importedPrompt.lastModified).toLocaleDateString() : 'Unknown'}</div>
                      <div>Tags: {conflict.importedPrompt.tags?.length || 0}</div>
                    </div>
                  </div>

                  <RadioGroup
                    value={conflictResolutions[conflict.promptId] || 'skip'}
                    onValueChange={(value: any) => handleConflictResolution(conflict.promptId, value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="skip" id={`skip-${conflict.promptId}`} />
                      <Label htmlFor={`skip-${conflict.promptId}`}>
                        Skip - Keep existing prompt unchanged
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="overwrite" id={`overwrite-${conflict.promptId}`} />
                      <Label htmlFor={`overwrite-${conflict.promptId}`}>
                        Overwrite - Replace existing with imported
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create_new" id={`create-new-${conflict.promptId}`} />
                      <Label htmlFor={`create-new-${conflict.promptId}`}>
                        Create New - Import as separate prompt
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <h3 className="text-lg font-medium mb-2">Importing Prompts...</h3>
      <p className="text-muted-foreground">
        Please wait while we import your prompts and resolve conflicts.
      </p>
    </div>
  );

  const getStepTitle = () => {
    switch (step) {
      case 'upload': return 'Upload Import File';
      case 'preview': return 'Preview Import';
      case 'conflicts': return 'Resolve Conflicts';
      case 'importing': return 'Importing...';
      default: return 'Import Prompts';
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'upload': return false;
      case 'preview': return preview !== null;
      case 'conflicts': return true;
      case 'importing': return false;
      default: return false;
    }
  };

  const getNextButtonText = () => {
    switch (step) {
      case 'preview': return preview?.conflictingPrompts.length ? 'Resolve Conflicts' : 'Import Now';
      case 'conflicts': return 'Import Now';
      default: return 'Next';
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetDialog();
      onOpenChange(open);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {getStepTitle()}
          </DialogTitle>
          <DialogDescription>
            Import prompts from a JSON export file with conflict resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && renderUploadStep()}
          {step === 'preview' && renderPreviewStep()}
          {step === 'conflicts' && renderConflictsStep()}
          {step === 'importing' && renderImportingStep()}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              if (step === 'preview') setStep('upload');
              else if (step === 'conflicts') setStep('preview');
              else onOpenChange(false);
            }}
            disabled={step === 'importing'}
          >
            {step === 'upload' ? 'Cancel' : 'Back'}
          </Button>
          
          {step !== 'importing' && (
            <Button 
              onClick={step === 'preview' ? handlePreviewNext : step === 'conflicts' ? handleImport : undefined}
              disabled={!canProceed() || isProcessing}
            >
              {isProcessing ? 'Processing...' : getNextButtonText()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}