/**
 * Analytics & error tracking.
 * Wraps Sentry when NEXT_PUBLIC_SENTRY_DSN is set, otherwise silently no-ops.
 * Provides lightweight event tracking for product analytics.
 */

import * as Sentry from '@sentry/nextjs';

const sentryEnabled = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

// ── Error tracking ────────────────────────────────────────────────────────────

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (sentryEnabled) {
    Sentry.captureException(err, { extra: context });
  } else {
    console.error('[Analytics:error]', err, context);
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (sentryEnabled) {
    Sentry.captureMessage(message, level);
  } else {
    console.info(`[Analytics:${level}]`, message);
  }
}

export function setUser(id: string | null, email?: string) {
  if (sentryEnabled) {
    Sentry.setUser(id ? { id, email } : null);
  }
}

// ── Product events ────────────────────────────────────────────────────────────
// Lightweight event log — swap out for PostHog / Mixpanel / custom table later.

type AnalyticsEvent =
  | { name: 'design_created'; device_id: string }
  | { name: 'design_exported'; format: string; count: number }
  | { name: 'device_selected'; device_id: string }
  | { name: 'image_uploaded'; zone_count: number }
  | { name: 'page_view'; path: string };

export function track(event: AnalyticsEvent) {
  if (sentryEnabled) {
    Sentry.addBreadcrumb({ category: 'analytics', message: event.name, data: event });
  }
  // Console in dev for visibility
  if (process.env.NODE_ENV === 'development') {
    console.info('[Track]', event);
  }
}
