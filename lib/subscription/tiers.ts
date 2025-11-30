/**
 * Subscription tier definitions
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface TierLimits {
  // Document limits
  maxDocuments: number;
  maxDocumentSize: number; // in bytes (50MB = 50 * 1024 * 1024)

  // API limits
  queriesPerDay: number;
  queriesPerHour: number;
  queriesPerMinute: number;

  // Processing limits
  maxConcurrentProcessing: number;

  // Storage limits
  maxStorageBytes: number; // in bytes

  // Feature flags
  features: {
    batchProcessing: boolean;
    documentComparison: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
    prioritySupport: boolean;
  };
}

/**
 * Subscription tier configurations
 */
export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxDocuments: 10,
    maxDocumentSize: 10 * 1024 * 1024, // 10MB
    queriesPerDay: 50,
    queriesPerHour: 10,
    queriesPerMinute: 3,
    maxConcurrentProcessing: 1,
    maxStorageBytes: 100 * 1024 * 1024, // 100MB
    features: {
      batchProcessing: false,
      documentComparison: false,
      advancedAnalytics: false,
      apiAccess: false,
      prioritySupport: false,
    },
  },
  pro: {
    maxDocuments: 100,
    maxDocumentSize: 50 * 1024 * 1024, // 50MB
    queriesPerDay: 500,
    queriesPerHour: 50,
    queriesPerMinute: 10,
    maxConcurrentProcessing: 3,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB
    features: {
      batchProcessing: true,
      documentComparison: true,
      advancedAnalytics: true,
      apiAccess: true,
      prioritySupport: false,
    },
  },
  enterprise: {
    maxDocuments: -1, // Unlimited
    maxDocumentSize: 100 * 1024 * 1024, // 100MB
    queriesPerDay: -1, // Unlimited
    queriesPerHour: -1, // Unlimited
    queriesPerMinute: 100,
    maxConcurrentProcessing: 10,
    maxStorageBytes: -1, // Unlimited
    features: {
      batchProcessing: true,
      documentComparison: true,
      advancedAnalytics: true,
      apiAccess: true,
      prioritySupport: true,
    },
  },
};

/**
 * Get limits for a subscription tier
 * @param tier - Subscription tier
 * @returns Tier limits
 */
export function getTierLimits(tier: SubscriptionTier = 'free'): TierLimits {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Check if a tier has a specific feature
 * @param tier - Subscription tier
 * @param feature - Feature name
 * @returns True if feature is enabled
 */
export function hasFeature(tier: SubscriptionTier, feature: keyof TierLimits['features']): boolean {
  return SUBSCRIPTION_TIERS[tier]?.features[feature] ?? false;
}

/**
 * Check if a value is within tier limits
 * @param tier - Subscription tier
 * @param limitType - Type of limit to check
 * @param value - Value to check
 * @returns True if within limits (-1 means unlimited)
 */
export function isWithinLimit(
  tier: SubscriptionTier,
  limitType: keyof Omit<TierLimits, 'features'>,
  value: number
): boolean {
  const limits = getTierLimits(tier);
  const limit = limits[limitType];

  if (typeof limit !== 'number') {
    return false;
  }

  // -1 means unlimited
  if (limit === -1) {
    return true;
  }

  return value <= limit;
}
