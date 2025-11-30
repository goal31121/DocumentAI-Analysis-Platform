'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, RefreshCw, Smile, Frown, Meh } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useDocumentSentiment, useInvalidateSentiment } from '@/lib/hooks/useDocumentSentiment';

export interface SentimentGaugeProps {
  documentId: string;
  className?: string;
}

export function SentimentGauge({ documentId, className }: SentimentGaugeProps) {
  // Use React Query hook - automatically handles caching, refetching, and state management
  const { data, isLoading, error, refetch, isFetching } = useDocumentSentiment(documentId);
  const invalidateSentiment = useInvalidateSentiment();

  const handleRefresh = () => {
    // Force refetch by invalidating cache
    invalidateSentiment(documentId);
    refetch();
  };

  const sentiment = data?.sentiment;
  const errorMessage = error instanceof Error ? error.message : 'Failed to load sentiment';

  const getSentimentIcon = () => {
    if (!sentiment) return null;
    switch (sentiment.sentiment) {
      case 'positive':
        return <Smile className="h-8 w-8 text-green-500" />;
      case 'negative':
        return <Frown className="h-8 w-8 text-red-500" />;
      default:
        return <Meh className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getSentimentColor = () => {
    if (!sentiment) return '';
    switch (sentiment.sentiment) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getSentimentBgColor = () => {
    if (!sentiment) return '';
    switch (sentiment.sentiment) {
      case 'positive':
        return 'bg-green-500/10';
      case 'negative':
        return 'bg-red-500/10';
      default:
        return 'bg-yellow-500/10';
    }
  };

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Sentiment</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </Button>
      </div>

      {isLoading && !sentiment && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive py-4">
          <p>{errorMessage}</p>
          <Button
            variant="link"
            size="sm"
            onClick={handleRefresh}
            className="p-0 h-auto mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {sentiment && (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center py-4">
            <div className={cn('rounded-full p-4 mb-3', getSentimentBgColor())}>{getSentimentIcon()}</div>
            <div className={cn('text-lg font-semibold capitalize', getSentimentColor())}>{sentiment.sentiment}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {Math.round(sentiment.score * 100)}% • {Math.round(sentiment.confidence * 100)}% confidence
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Sentiment Score</span>
              <span>{Math.round(sentiment.score * 100)}%</span>
            </div>
            <Progress
              value={sentiment.score * 100}
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Confidence</span>
              <span>{Math.round(sentiment.confidence * 100)}%</span>
            </div>
            <Progress
              value={sentiment.confidence * 100}
              className="h-2"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
