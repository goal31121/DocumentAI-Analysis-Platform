'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, MessageSquare, FileText, TrendingUp } from 'lucide-react';

export interface AnalysisPanelProps {
  documentId?: string;
  className?: string;
  onToggle?: () => void;
  isOpen?: boolean;
}

export function AnalysisPanel({ documentId, className, onToggle, isOpen = true }: AnalysisPanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background border-l border-border transition-all duration-300',
        !isOpen && 'w-0 overflow-hidden',
        isOpen && 'w-96',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Analysis</h3>
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            <span className="sr-only">Toggle panel</span>×
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <Card className="p-8 border-dashed">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-semibold">Analysis Features Coming Soon</h4>
              <p className="text-sm text-muted-foreground max-w-sm">
                AI-powered document analysis features will be available here, including Q&A chat, summarization, and
                entity extraction.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 w-full">
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <MessageSquare className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Q&A Chat</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <FileText className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Summary</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <TrendingUp className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Entities</span>
              </div>
              <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <Sparkles className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-xs text-muted-foreground">Insights</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
