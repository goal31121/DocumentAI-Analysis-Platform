'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formatBytes } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface QuotaStatus {
  subscription: {
    tier: string;
    status: string;
  };
  quota: {
    documents: {
      current: number;
      limit: number;
      remaining: number;
    };
    storage: {
      current: number;
      limit: number;
      remaining: number;
    };
    concurrentProcessing: {
      current: number;
      limit: number;
      remaining: number;
    };
  };
}

async function fetchQuotaStatus(): Promise<QuotaStatus> {
  const response = await fetch('/api/subscriptions/status');
  if (!response.ok) {
    throw new Error('Failed to fetch quota status');
  }
  return response.json();
}

export function QuotaWarning() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: fetchQuotaStatus,
    refetchInterval: 60000, // Refetch every minute
  });

  if (!data || data.subscription.tier !== 'free') {
    return null; // Only show warnings for free tier
  }

  const { quota } = data;
  const warnings: string[] = [];

  // Check if approaching limits (80% or more)
  const docPercentage = quota.documents.limit > 0 ? (quota.documents.current / quota.documents.limit) * 100 : 0;
  const storagePercentage = quota.storage.limit > 0 ? (quota.storage.current / quota.storage.limit) * 100 : 0;

  if (docPercentage >= 80) {
    warnings.push(
      `Documents: ${quota.documents.current}/${quota.documents.limit} (${Math.round(docPercentage)}% used)`
    );
  }

  if (storagePercentage >= 80) {
    warnings.push(
      `Storage: ${formatBytes(quota.storage.current)}/${formatBytes(quota.storage.limit)} (${Math.round(
        storagePercentage
      )}% used)`
    );
  }

  if (warnings.length === 0) {
    return null;
  }

  const handleUpgrade = async () => {
    router.push('/settings/subscription');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-yellow-100 dark:hover:bg-yellow-900/20"
        >
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <Badge className="absolute top-1 right-1 h-2 w-2 p-0 bg-yellow-600" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80"
      >
        <DropdownMenuLabel>Quota Warnings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {warnings.map((warning, index) => (
          <DropdownMenuItem
            key={index}
            className="text-sm"
          >
            {warning}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            onClick={handleUpgrade}
            className="w-full"
            size="sm"
          >
            Upgrade to Pro
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
