'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { SubscriptionTier } from '@/lib/subscription/tiers';

interface PricingTableProps {
  currentTier: SubscriptionTier;
  onSelectPlan: (tier: 'pro' | 'enterprise', priceId: string) => void;
  proPriceId?: string;
  enterprisePriceId?: string;
}

const plans = [
  {
    name: 'Free',
    tier: 'free' as SubscriptionTier,
    price: '$0',
    description: 'Perfect for trying out DocAI',
    features: ['10 documents', '100MB storage', '1 concurrent processing', 'Basic Q&A', 'Community support'],
  },
  {
    name: 'Pro',
    tier: 'pro' as SubscriptionTier,
    price: '$29',
    description: 'For professionals and small teams',
    features: [
      '100 documents',
      '10GB storage',
      '3 concurrent processing',
      'Advanced Q&A with citations',
      'Analytics dashboard',
      'API access',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    tier: 'enterprise' as SubscriptionTier,
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited documents',
      'Unlimited storage',
      '10 concurrent processing',
      'Custom AI models',
      'Dedicated support',
      'SSO integration',
      'SLA guarantee',
    ],
  },
];

export function PricingTable({ currentTier, onSelectPlan, proPriceId, enterprisePriceId }: PricingTableProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrent = plan.tier === currentTier;
        const canUpgrade = currentTier === 'free' && plan.tier === 'pro';
        const canUpgradeToEnterprise = (currentTier === 'free' || currentTier === 'pro') && plan.tier === 'enterprise';

        return (
          <Card
            key={plan.name}
            className={`relative ${isCurrent ? 'border-primary border-2' : ''} ${
              plan.tier === 'pro' ? 'border-blue-500' : ''
            }`}
          >
            {isCurrent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                Current Plan
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-muted-foreground text-lg">/month</span>}
              </div>
              <CardDescription className="mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start space-x-3"
                  >
                    <Check className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <Button
                  disabled
                  className="w-full"
                  variant="outline"
                >
                  Current Plan
                </Button>
              ) : canUpgrade && proPriceId ? (
                <Button
                  onClick={() => onSelectPlan('pro', proPriceId)}
                  className="w-full"
                  size="lg"
                >
                  Upgrade to Pro
                </Button>
              ) : canUpgradeToEnterprise ? (
                <Button
                  onClick={() => {
                    if (enterprisePriceId) {
                      onSelectPlan('enterprise', enterprisePriceId);
                    } else {
                      // Contact sales flow
                      window.location.href = 'mailto:sales@docai.com?subject=Enterprise Plan Inquiry';
                    }
                  }}
                  className="w-full"
                  size="lg"
                  variant="outline"
                >
                  Contact Sales
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full"
                  variant="outline"
                >
                  Not Available
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
