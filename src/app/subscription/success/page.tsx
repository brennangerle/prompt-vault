'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you might want to verify the session with your backend
    // For now, we'll just show a success message
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Subscription Successful!</CardTitle>
          <CardDescription>
            Thank you for subscribing. Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <p className="text-gray-600">Processing your subscription...</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">What happens next?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• You'll receive a confirmation email with your receipt</li>
                  <li>• Your subscription is now active</li>
                  <li>• You can manage your subscription from your account settings</li>
                  <li>• If you have any questions, our support team is here to help</li>
                </ul>
              </div>

              <div className="flex gap-4 justify-center pt-4">
                <Button onClick={() => router.push('/')}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => router.push('/settings')}>
                  Account Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}