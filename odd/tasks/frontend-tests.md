# Frontend Tests Task

## Objective
Add Jest unit and integration tests for the main frontend parts:
- **metersSlice** – verify the initial state.
- **dataSlice** – test the async thunk lifecycle (pending, fulfilled, rejected).
- **MeterList** – ensure loading, error and data rendering using mocked RTK Query hooks.
- **MeterDetail** – similar loading/error/data checks.
- **DashboardPage** – test loading, error and basic rendering of analysis data.

## Files Added
- `frontend/src/features/meters/__tests__/metersSlice.test.ts`
- `frontend/src/features/data/__tests__/dataSlice.test.ts`
- `frontend/src/components/__tests__/MeterList.test.tsx`
- `frontend/src/components/__tests__/MeterDetail.test.tsx`
- `frontend/src/components/__tests__/DashboardPage.test.tsx`

## Test Strategy
- Use **Jest** with **ts‑jest** (already configured).
- Mock **RTK Query** hooks (`useGetMetersQuery`, `useGetMeterDetailQuery`, `useGetAnalysisQuery`) to control loading, error and data states.
- For the async thunk in `dataSlice`, directly dispatch the generated actions (`fetchData.pending`, `.fulfilled`, `.rejected`).
- Verify UI output with **React Testing Library** assertions.

## Validation
Running `npm test` (or `yarn test`) should discover all new test files under `src/**/__tests__/**/*.ts?(x)` and all tests must pass.

## Tracking
Recorded in the ODD task system under `odd/tasks/frontend-tests.md`.
