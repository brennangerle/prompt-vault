import { BulkOperationsDemo } from '@/components/bulk-operations-demo';

export default function BulkOperationsTestPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Bulk Operations Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the bulk operations interface for prompt management.
        </p>
      </div>
      
      <BulkOperationsDemo />
    </div>
  );
}