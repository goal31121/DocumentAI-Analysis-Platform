'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Zap } from 'lucide-react';
import { SubscriptionTier } from '@/lib/subscription/tiers';
import { format } from 'date-fns';

interface SubscriptionCardProps {
  tier: SubscriptionTier;
  status: string;
  expiresAt: Date | null;
  onUpgrade?: () => void;
  onCancel?: () => void;
}

export function SubscriptionCard({ tier, status, expiresAt, onUpgrade, onCancel }: SubscriptionCardProps) {
  const tierConfig = {
    free: {
      name: 'Free',
      icon: null,
      color: 'bg-gray-100 text-gray-800',
      description: 'Perfect for trying out DocAI',
    },
    pro: {
      name: 'Pro',
      icon: Zap,
      color: 'bg-blue-100 text-blue-800',
      description: 'For professionals and small teams',
    },
    enterprise: {
      name: 'Enterprise',
      icon: Crown,
      color: 'bg-purple-100 text-purple-800',
      description: 'For large organizations',
    },
  };

  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            <CardTitle className="text-2xl">{config.name}</CardTitle>
          </div>
          <Badge className={config.color}>{status}</Badge>
        </div>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {expiresAt && tier !== 'free' && (
            <div className="text-sm text-muted-foreground">
              <p>
                {status === 'canceled' ? 'Expires on' : 'Renews on'} {format(new Date(expiresAt), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {tier === 'free' && onUpgrade && (
              <Button
                onClick={onUpgrade}
                className="w-full"
              >
                Upgrade to Pro
              </Button>
            )}
            {tier === 'pro' && onUpgrade && (
              <Button
                onClick={onUpgrade}
                variant="outline"
                className="w-full"
              >
                Upgrade to Enterprise
              </Button>
            )}
            {tier !== 'free' && status === 'active' && onCancel && (
              <Button
                onClick={onCancel}
                variant="destructive"
                className="w-full"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
