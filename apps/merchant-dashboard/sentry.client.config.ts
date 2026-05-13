import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'staging',
  // Capture 100% of errors, 5% of transactions (performance)
  tracesSampleRate: 0.05,
  debug: false,
});
