import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Search, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'minimal' | 'illustrated';
}

const defaultIcons = {
  documents: <FileText className="h-12 w-12 text-muted-foreground" />,
  upload: <Upload className="h-12 w-12 text-muted-foreground" />,
  search: <Search className="h-12 w-12 text-muted-foreground" />,
  inbox: <Inbox className="h-12 w-12 text-muted-foreground" />,
};

/**
 * EmptyState - Enhanced empty state component with illustrations
 */
export function EmptyState({ title, description, icon, action, className, variant = 'default' }: EmptyStateProps) {
  const displayIcon = icon || defaultIcons.documents;

  if (variant === 'minimal') {
    return (
      <div className={cn('text-center py-8', className)}>
        {displayIcon && <div className="flex justify-center mb-3">{displayIcon}</div>}
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        {action && (
          <Button
            onClick={action.onClick}
            size="sm"
            className="mt-4"
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'illustrated') {
    return (
      <Card className={cn('border-dashed', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 px-6">
          <div className="relative mb-6">
            {/* Decorative background circle */}
            <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl" />
            <div className="relative">{displayIcon}</div>
          </div>
          <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
          {description && <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">{description}</p>}
          {action && (
            <Button
              onClick={action.onClick}
              size="lg"
            >
              {action.label}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6', className)}>
      <div className="mb-4">{displayIcon}</div>
      <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      {description && <p className="text-sm text-muted-foreground text-center max-w-md mb-6">{description}</p>}
      {action && (
        <Button
          onClick={action.onClick}
          size="lg"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

/**
 * Pre-configured empty states for common scenarios
 */
export const EmptyStates = {
  NoDocuments: (props?: { onUpload?: () => void }) => (
    <EmptyState
      title="No documents yet"
      description="Upload your first document to get started with AI-powered analysis and insights."
      icon={defaultIcons.documents}
      action={
        props?.onUpload
          ? {
              label: 'Upload Document',
              onClick: props.onUpload,
            }
          : undefined
      }
      variant="illustrated"
    />
  ),
  NoSearchResults: (props?: { onClear?: () => void }) => (
    <EmptyState
      title="No results found"
      description="Try adjusting your search terms or filters to find what you're looking for."
      icon={defaultIcons.search}
      action={
        props?.onClear
          ? {
              label: 'Clear Search',
              onClick: props.onClear,
            }
          : undefined
      }
      variant="default"
    />
  ),
  NoConversations: () => (
    <EmptyState
      title="No conversations yet"
      description="Start asking questions about your document to see conversation history here."
      icon={defaultIcons.inbox}
      variant="minimal"
    />
  ),
};
