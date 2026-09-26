# Decision: use the Next.js bundler instead of Vite (superseded)

> **Status: superseded.** This file keeps its original name so existing links do not break. The Vite migration described in the *Original intent* section below was **never carried out**. The project runs on **Next.js 16 with the App Router** and its built-in Turbopack bundler; there is no Vite and no React Router in the repository.

## Date

Final decision: **2026-09-24** — commit `db483f34`, *"docs: decide against Vite, document using Next.js bundler"*.

## Original intent

`assets/Frontend_implementation_plan.md` originally proposed migrating the frontend away from Next.js (Webpack) to **Vite (esbuild)** plus **React Router v6**, expecting faster builds and a lighter setup. The plan at that time was to:

- Scaffold a Vite project and move `src/` and related assets.
- Replace the Next.js App Router with React Router routes.
- Update imports that relied on `next/navigation`.
- Switch the `package.json` scripts from the Next.js CLI to the Vite CLI.
- Update CI accordingly.

## Final decision

The migration was cancelled. The frontend stays on **Next.js 16 (App Router)** with its supported bundler. Vite and React Router were removed and are not dependencies of this project.

## Rationale

- **Single supported bundler.** Keeping two bundler setups (Next.js/Turbopack and Vite/esbuild) adds configuration and CI surface without a benefit for this app.
- **The App Router is the routing model the app needs.** File-based routes under `src/app`, layouts, `next/navigation` hooks such as `useParams`, and the server/client component boundary in `src/app/meter/[id]/page.tsx` are load-bearing for the current pages. React Router would have forced a rewrite of that whole layer.
- The migration plan never produced working code, so staying on Next.js avoided a dead end.

## Consequences

- Scripts remain Next.js-based: `next dev`, `next build`, `next start` (see `package.json`).
- Routes live under `src/app` and are documented in `ROUTES.md`.
- No Vite configuration file and no React Router dependency exist in the repository.
- The untracked `dist/` folder at the repository root is leftover build output from the abandoned setup and is not part of the application.

## References

- Next.js App Router documentation: <https://nextjs.org/docs/app>
- Original (superseded) plan: `assets/Frontend_implementation_plan.md`
- Current stack summary: `README.md`
