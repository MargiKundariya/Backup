/**
 * Stripe server-side client.
 * Never import this file in client components — it exposes STRIPE_SECRET_KEY.
 *
 * Credit pack definitions are the single source of truth for pricing.
 * These IDs must match the Stripe Product/Price IDs created in your dashboard.
 */

import Stripe from 'stripe';

// ── Server-side Stripe client ─────────────────────────────────────────────────
export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY in server environment');
  }
  return new Stripe(secretKey, { apiVersion: '2025-03-31.basil' });
}

// ── Credit pack definitions ───────────────────────────────────────────────────
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;        // USD cents
  priceId: string;      // Stripe Price ID (set via STRIPE_PRICE_* env vars)
  perCredit: string;    // display string
  popular?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 150,
    price: 500,
    priceId: process.env.STRIPE_PRICE_STARTER ?? '',
    perCredit: '$0.033',
  },
  {
    id: 'standard',
    name: 'Standard',
    credits: 500,
    price: 1400,
    priceId: process.env.STRIPE_PRICE_STANDARD ?? '',
    perCredit: '$0.028',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 1500,
    price: 3500,
    priceId: process.env.STRIPE_PRICE_PRO ?? '',
    perCredit: '$0.023',
  },
  {
    id: 'business',
    name: 'Business',
    credits: 5000,
    price: 9900,
    priceId: process.env.STRIPE_PRICE_BUSINESS ?? '',
    perCredit: '$0.020',
  },
  {
    id: 'bulk',
    name: 'Bulk',
    credits: 20000,
    price: 29900,
    priceId: process.env.STRIPE_PRICE_BULK ?? '',
    perCredit: '$0.015',
  },
];

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Subscription plans ────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: string;
  name: string;
  /** Monthly credits auto-credited on each billing cycle */
  creditsPerMonth: number;
  /** USD cents per month */
  price: number;
  priceId: string;             // Stripe recurring Price ID
  description: string;
  features: string[];
  popular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'pro-monthly',
    name: 'Pro Plan',
    creditsPerMonth: 1000,
    price: 9900,               // $99 / month
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    description: 'Best for active vendors generating mockups every week.',
    features: [
      '1,000 credits every month',
      'Credits roll over (up to 2 months)',
      'All 52 device templates',
      'Compliance export presets',
      'Priority email support',
    ],
    popular: true,
  },
];
