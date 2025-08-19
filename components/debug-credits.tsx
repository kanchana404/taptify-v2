"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DebugCredits() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testAddCredits = async (amount: number) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/add-credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ creditAmount: amount }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to add credits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentCredits = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/test/add-credits');
      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Failed to get credits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Debug Credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Current User ID:</strong> {user?.id || 'Not signed in'}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Email:</strong> {user?.emailAddresses?.[0]?.emailAddress || 'N/A'}
          </p>
        </div>

        <div className="space-y-2">
          <Button 
            onClick={() => testAddCredits(10)} 
            disabled={loading}
            className="w-full"
          >
            Add 10 Credits
          </Button>
          
          <Button 
            onClick={() => testAddCredits(50)} 
            disabled={loading}
            className="w-full"
          >
            Add 50 Credits
          </Button>
          
          <Button 
            onClick={getCurrentCredits} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Get Current Credits
          </Button>
        </div>

        {loading && (
          <p className="text-sm text-gray-500">Loading...</p>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">Error: {error}</p>
          </div>
        )}

        {result && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <pre className="text-sm text-green-800 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


