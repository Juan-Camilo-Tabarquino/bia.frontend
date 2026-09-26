# Feature: Frontend Authentication

## Overview
Implemented a simple authentication context (`AuthContext`) that stores a token in `localStorage` and provides `login` and `logout` functions. Added a `useAuth` hook for component access.

Created a `PrivateRoute` component that redirects unauthenticated users to `/login`.

Integrated the `AuthProvider` into the root layout and wrapped the dashboard page with `PrivateRoute` to protect the route.

## Files Added
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/components/PrivateRoute.tsx`
- Updated `frontend/src/app/layout.tsx`
- Updated `frontend/src/app/dashboard/page.tsx`

## Documentation
The feature is tracked in this markdown file and listed under `odd/tasks/frontend-auth.md` for ODD task tracking.
