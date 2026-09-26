# Decision: use the Next.js bundler instead of Vite (superseded)

> **Status: superseded.** This file was moved from the repository root `VITE_DECISION.md` to `docs/decisions/vite-decision.md` and renamed to match the `docs/` naming convention, so root-level links to the old path no longer resolve. The Vite migration described in the *Original intent* section below was **never carried out**. The project runs on **Next.js 16 with the App Router** and its built-in Turbopack bundler; there is no Vite and no React Router in the repository.

## Date

Final decision: **2026-09-24** — commit `db483f34`, *"docs: decide against Vite, document using Next.js bundler"*.

## Original intent

`docs/requisitos/Frontend_implementation_plan.md` lists **`vite`** as the packaging tool while still naming **Next.js (App Router)** as the framework. It does not mention React Router, does not propose leaving Next.js, and never says "Webpack". The intent reconstructed at the time, which is what the decision below was taken against rather than what that file literally states, was to:

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
- Routes live under `src/app` and are documented in `docs/routes.md`.
- No Vite configuration file and no React Router dependency exist in the repository.
- No `dist/` build directory exists in the repository; `dist/` remains listed in `.gitignore` as a leftover of the abandoned Vite setup.

## References

- Next.js App Router documentation: <https://nextjs.org/docs/app>
- Original (superseded) plan: `docs/requisitos/Frontend_implementation_plan.md`
- Current stack summary: `README.md`
