'use client';

import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatBytes } from '@/lib/utils';

interface QuotaMeterProps {
  label: string;
  current: number;
  limit: number;
  unit?: 'bytes' | 'count';
  description?: string;
}

export function QuotaMeter({ label, current, limit, unit = 'count', description }: QuotaMeterProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;

  const displayCurrent = unit === 'bytes' ? formatBytes(current) : current.toLocaleString();
  const displayLimit = isUnlimited ? 'Unlimited' : unit === 'bytes' ? formatBytes(limit) : limit.toLocaleString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Usage</span>
            <span
              className={
                isAtLimit ? 'text-destructive font-semibold' : isNearLimit ? 'text-yellow-600 font-semibold' : ''
              }
            >
              {displayCurrent} / {displayLimit}
            </span>
          </div>
          {!isUnlimited && (
            <Progress
              value={percentage}
              className={isAtLimit ? 'bg-destructive/20' : isNearLimit ? 'bg-yellow-100' : ''}
            />
          )}
          {isNearLimit && !isAtLimit && <p className="text-xs text-yellow-600">You&apos;re approaching your limit</p>}
          {isAtLimit && <p className="text-xs text-destructive font-semibold">You&apos;ve reached your limit</p>}
        </div>
      </CardContent>
    </Card>
  );
}
