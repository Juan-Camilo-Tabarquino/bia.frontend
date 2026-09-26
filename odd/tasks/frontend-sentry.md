# Frontend Sentry Integration

## Changes Made
- Added **frontend/src/sentry.client.config.ts** with Sentry client initialization (DSN placeholder).
- Updated **frontend/src/app/layout.tsx** to import the Sentry config and wrap the application UI in `Sentry.ErrorBoundary`.
- Imported the config via a side‑effect import (`@/sentry.client.config`).

## Documentation
The error boundary will catch client‑side rendering errors and report them to Sentry. Replace the placeholder DSN in `sentry.client.config.ts` with your actual Sentry DSN (or set `NEXT_PUBLIC_SENTRY_DSN` environment variable).

## Next Steps
- Install `@sentry/nextjs` package if not already present.
- Configure the DSN in environment variables or directly in the config file.
- Verify Sentry captures errors by triggering a client error in development.
