> **Historia — nunca ejecutada.** Este plan de migración a Vite nunca se llevó a cabo. La decisión de mantener
> Next.js está registrada en [`docs/decisions/vite-decision.md`](../../docs/decisions/vite-decision.md).

# Frontend Vite Migration

## Goal
Migrate the current Next.js based frontend to a Vite‑powered React application as required by the implementation plan.

### Steps
1. Scaffold a new Vite React project (`npm create vite@latest` or `yarn create vite`).
2. Move existing source files (`src/`), preserving folder structure.
3. Replace Next.js routing with React Router (v6) – create routes for `/`, `/dashboard`, `/meters`, `/meter/:id`, `/meter/:id/readings`.
4. Adjust imports that rely on Next.js utilities (`next/navigation`, `next/link`, `next/image`).
5. Keep all existing Ant Design, Recharts, Redux Toolkit & RTK Query logic.
6. Update build scripts in `package.json` (`vite dev`, `vite build`).
7. Ensure TypeScript configuration (`tsconfig.json`) is compatible with Vite.
8. Run existing tests; adjust any Next.js‑specific test setup.
9. Update CI scripts to use Vite commands.
10. Verify the application works locally and passes all tests.

## Acceptance Criteria
- The app builds and runs with `yarn dev` using Vite.
- All existing pages (Dashboard, Meter list/detail) function identically.
- No Next.js dependencies remain in the production bundle.
- CI pipeline passes.
