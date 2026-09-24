// Sentry client-side configuration
// Replace the DSN placeholder with your actual Sentry DSN.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://examplePublicKey@o0.ingest.sentry.io/0',
  // Adjust the sample rate as needed
  tracesSampleRate: 1.0,
  // You can add more options here per Sentry documentation
});
