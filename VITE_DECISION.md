# Decision: Use Next.js bundler (Webpack) instead of Vite

## Context
The project is a Next.js application that relies on the framework's built‑in bundler (Webpack) and custom Next.js agent rules. There was an earlier task to decide whether to introduce Vite as the bundler.

## Decision
We will **continue using the Next.js bundler (Webpack)** and **not adopt Vite** for this project.

## Rationale
- The existing codebase, conventions, and the `AGENTS.md` rules are tightly coupled to Next.js.
- Switching to Vite would require significant configuration changes and could break the custom Next.js agent files.
- The current build pipeline works correctly, and there is no compelling performance or feature benefit that outweighs the migration cost.

## References
- Next.js documentation (https://nextjs.org/docs)
- Project `AGENTS.md` indicating custom Next.js agent handling.
