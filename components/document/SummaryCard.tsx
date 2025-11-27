'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SummaryCardProps {
  documentId: string;
  className?: string;
}

export function SummaryCard({ documentId, className }: SummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/summarize?documentId=${documentId}`);

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const data = await response.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else {
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [documentId]);

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Summary</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSummary}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </Button>
      </div>

      {loading && !summary && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4">
          <p>{error}</p>
          <Button
            variant="link"
            size="sm"
            onClick={fetchSummary}
            className="p-0 h-auto mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {summary && <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{summary}</div>}
    </Card>
  );
}
