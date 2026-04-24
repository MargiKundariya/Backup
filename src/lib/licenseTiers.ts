/**
 * License tier definitions for Windows desktop app.
 * Mirrors the DB CHECK constraint: 'individual' | 'studio' | 'agency'
 */

export type LicenseTier = 'individual' | 'studio' | 'agency';

export interface LicenseTierConfig {
  id: LicenseTier;
  name: string;
  maxSeats: number;
  price: number;          // USD cents
  description: string;
  features: string[];
}

export const LICENSE_TIERS: LicenseTierConfig[] = [
  {
    id: 'individual',
    name: 'Individual',
    maxSeats: 1,
    price: 4900,
    description: 'Solo vendor or freelancer',
    features: [
      '1 PC activation',
      'All device templates',
      'Bulk export',
      'Lifetime license',
      'Free minor updates (v1.x)',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    maxSeats: 3,
    price: 12900,
    description: 'Small team or shared workstation',
    features: [
      'Up to 3 PC activations',
      'All Individual features',
      'Priority email support',
      'Lifetime license',
      'Free minor + major updates (v2.x)',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    maxSeats: 10,
    price: 34900,
    description: 'Large team or reseller',
    features: [
      'Up to 10 PC activations',
      'All Studio features',
      'Dedicated Slack support',
      'Custom branding (white-label export)',
      'Lifetime license + all future updates',
    ],
  },
];

export function getTierConfig(tier: LicenseTier): LicenseTierConfig {
  const config = LICENSE_TIERS.find((t) => t.id === tier);
  if (!config) throw new Error(`Unknown license tier: ${tier}`);
  return config;
}

export function formatLicensePrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
