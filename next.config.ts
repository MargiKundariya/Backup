import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:8000';

// ── QUICK FIX CSP (Stripe + Next.js compatible) ──────────────────────────────
const cspDirectives = [
  "default-src 'self'",

  // ✅ FIX (important for Next.js + Stripe)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",

  "style-src 'self' 'unsafe-inline'",

  `img-src 'self' data: blob: ${supabaseUrl}`,

  "font-src 'self' data:",

  `connect-src 'self' ${supabaseUrl} https://api.stripe.com https://*.stripe.com`,

  "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",

  "worker-src 'self' blob:",

  "object-src 'none'",

  "upgrade-insecure-requests",
].join('; ');

const productionHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    if (isDev) return [];

    return [
      {
        source: '/(.*)',
        headers: productionHeaders,
      },
    ];
  },
};

export default nextConfig;