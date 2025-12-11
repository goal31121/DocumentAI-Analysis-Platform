'use client';

import { useEffect, useState, Suspense } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SubscriptionCard } from '@/components/subscription/SubscriptionCard';
import { QuotaMeter } from '@/components/subscription/QuotaMeter';
import { PricingTable } from '@/components/subscription/PricingTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useSearchParams, useRouter } from 'next/navigation';

interface SubscriptionStatus {
  subscription: {
    tier: string;
    status: string;
    expiresAt: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
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
    tier: string;
  };
}

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  const response = await fetch('/api/subscriptions/status');
  if (!response.ok) {
    throw new Error('Failed to fetch subscription status');
  }
  return response.json();
}

async function createCheckoutSession(tier: string, priceId: string) {
  const response = await fetch('/api/subscriptions/create-checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tier, priceId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create checkout session');
  }

  return response.json();
}

async function cancelSubscription(immediately: boolean = false) {
  const response = await fetch('/api/subscriptions/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ immediately }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel subscription');
  }

  return response.json();
}

function SubscriptionPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPricing, setShowPricing] = useState(false);

  // Check for success/cancel redirects from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success) {
      toast.success('Subscription activated successfully!');
      router.replace('/settings/subscription');
    }
    if (canceled) {
      toast.info('Checkout was canceled');
      router.replace('/settings/subscription');
    }
  }, [searchParams, router]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: fetchSubscriptionStatus,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ tier, priceId }: { tier: string; priceId: string }) => createCheckoutSession(tier, priceId),
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to start checkout');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      toast.success('Subscription canceled successfully');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel subscription');
    },
  });

  const handleUpgrade = () => {
    setShowPricing(true);
  };

  const handleSelectPlan = (tier: 'pro' | 'enterprise', priceId: string) => {
    checkoutMutation.mutate({ tier, priceId });
  };

  const handleCancel = () => {
    if (
      confirm(
        'Are you sure you want to cancel your subscription? You will lose access to Pro features at the end of your billing period.'
      )
    ) {
      cancelMutation.mutate(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6">Failed to load subscription data</div>;
  }

  const { subscription, quota } = data;

  return (
    <div className="p-6 pb-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your subscription and view usage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionCard
          tier={subscription.tier as 'free' | 'pro' | 'enterprise'}
          status={subscription.status}
          expiresAt={subscription.expiresAt ? new Date(subscription.expiresAt) : null}
          onUpgrade={handleUpgrade}
          onCancel={handleCancel}
        />

        <div className="space-y-4">
          <QuotaMeter
            label="Documents"
            current={quota.documents.current}
            limit={quota.documents.limit}
            unit="count"
            description="Total documents uploaded"
          />
          <QuotaMeter
            label="Storage"
            current={quota.storage.current}
            limit={quota.storage.limit}
            unit="bytes"
            description="Total storage used"
          />
          <QuotaMeter
            label="Concurrent Processing"
            current={quota.concurrentProcessing.current}
            limit={quota.concurrentProcessing.limit}
            unit="count"
            description="Documents currently processing"
          />
        </div>
      </div>

      {showPricing && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Plan</CardTitle>
            <CardDescription>Choose a plan that fits your needs</CardDescription>
          </CardHeader>
          <CardContent>
            <PricingTable
              currentTier={subscription.tier as 'free' | 'pro' | 'enterprise'}
              onSelectPlan={handleSelectPlan}
              proPriceId={process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID}
              enterprisePriceId={process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID}
            />
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={() => setShowPricing(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <SubscriptionPageContent />
    </Suspense>
  );
}
