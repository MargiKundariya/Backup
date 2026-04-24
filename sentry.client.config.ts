import * as Sentry from '@sentry/nextjs';

// Only initialise when DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,

    // Replay 1% of sessions; 100% on errors
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],

    // Filter noise
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error exception captured',
      'Network request failed',
    ],
  });
}
