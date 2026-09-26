# Frontend Types Task

## Description
Created comprehensive TypeScript interfaces for backend DTOs in `frontend/src/types/backend.ts` and replaced all usage of `any` with these concrete types throughout the codebase (components, API slice, Redux slices).

## Changes
- Added `backend.ts` with `Meter`, `MeterDetail`, `Reading`, `Anomaly`, `Analysis` interfaces.
- Updated imports and typings in:
  - `components/MeterList.tsx`
  - `components/dashboard/ToolProof.tsx`
  - `features/api/apiSlice.ts`
  - `features/meters/metersSlice.ts`
  - `features/dashboards/dashboardSlice.ts`
  - `features/data/dataSlice.ts`
- Adjusted error handling casts to avoid `any`.
- Updated Redux slices initial state typings.

## Tracking
Documented in this file as part of ODD.
