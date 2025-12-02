import Stripe from 'stripe';
import { env } from '@/lib/env';

/**
 * Initialize Stripe client
 */
export function getStripeClient(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });
}

/**
 * Get Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string): Promise<Stripe.Customer | null> {
  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(customerId);
    return customer.deleted ? null : (customer as Stripe.Customer);
  } catch (error) {
    console.error('Error retrieving Stripe customer:', error);
    return null;
  }
}

/**
 * Create Stripe customer
 */
export async function createStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const stripe = getStripeClient();
  return await stripe.customers.create({
    email,
    name,
    metadata,
  });
}

/**
 * Get Stripe subscription by ID
 */
export async function getStripeSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    const stripe = getStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Error retrieving Stripe subscription:', error);
    return null;
  }
}

/**
 * Cancel Stripe subscription
 */
export async function cancelStripeSubscription(
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();

  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancel at period end
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

/**
 * Create Stripe Checkout session
 */
export async function createCheckoutSession(
  customerId: string | null,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else {
    sessionParams.customer_creation = 'always';
  }

  return await stripe.checkout.sessions.create(sessionParams);
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

/**
 * Map Stripe subscription status to our subscription status
 */
export function mapStripeStatusToSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'unpaid':
      return 'unpaid';
    case 'incomplete':
    case 'incomplete_expired':
      return 'inactive';
    case 'trialing':
      return 'active'; // Treat trialing as active
    default:
      return 'inactive';
  }
}

/**
 * Map Stripe subscription to subscription tier
 * This should match your Stripe product/price configuration
 */
export function mapStripePriceToTier(priceId: string): 'free' | 'pro' | 'enterprise' {
  // You'll need to set these price IDs in your Stripe dashboard
  // For now, we'll use environment variables or a mapping
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (priceId === proPriceId) {
    return 'pro';
  }
  if (priceId === enterprisePriceId) {
    return 'enterprise';
  }

  // Default to free if unknown
  return 'free';
}
