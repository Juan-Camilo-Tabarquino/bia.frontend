# Contributing to BIA Frontend

Thank you for your interest in contributing! This guide outlines the workflow we follow to keep the codebase consistent and maintainable.

---

## Getting Started

1. **Fork the repository** and clone your fork locally.
   ```bash
   git clone https://github.com/<your-username>/bia.frontend.git
   cd bia.frontend
   ```
2. **Create a new branch** for your work (see the Branching Strategy section).

---

## Install Dependencies

We use Node.js (20, the version CI runs on) and **npm** (the repository ships a `package-lock.json`):

```bash
# Install project dependencies
npm install
```

---

## Running the Development Server

```bash
npm run dev
```

This starts the Next.js development server (App Router, Turbopack) with hot reloading. Open `http://localhost:3000` in your browser.

The API base URL would come from `NEXT_PUBLIC_API_URL` (see `src/utils/apiBaseUrl.ts`). The repository ships a tracked `.env.example` at the root that documents the variable; copy it to `.env.local` if you want to set it, for example:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Be aware that the variable **has no browser effect today**: the read is not statically inlined by Next, so the hardcoded fallback wins and the running client always talks to `http://localhost:3001/api`. This is the `apiBaseUrl-never-inlined` defect documented in section 4 of [`docs/frontend-guide.md`](docs/frontend-guide.md).

---

## Testing

We use **Jest** and **React Testing Library**.

```bash
# Run all tests
npm test
```

Make sure new code is covered by tests and that the existing test suite passes before opening a PR.

---

## Linting & Formatting

ESLint is configured with `eslint-config-next`. Run it before committing:

```bash
# Lint only
npm run lint
```

There is no Prettier in this repository. It is not declared in `package.json` or `package-lock.json`, so a fresh `npm ci` does not install it, and there is no formatting configuration to apply. If you want to check formatting, install Prettier for yourself in a scratch directory rather than adding it to this project's manifest, which is a separate decision.

The single CI job, `build`, runs `npm ci`, `npm run lint`, `npm test` and `npm run build`, so a lint error, a failing test or a failing build all stop it.

---

## Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `next dev` | Development server |
| `npm run build` | `next build` | Production build |
| `npm start` | `next start` | Serve the production build |
| `npm run lint` | `eslint .` | Lint |
| `npm test` | `jest` | Run the test suite |

There is no separate `lint:fix`, `format`, `format:check`, `test:watch` or `commit` script; use the commands above.

---

## Commit Conventions

We follow **Conventional Commits**. A commit message must have the form:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Common types:

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation only changes
- `style`: code style changes (formatting, missing semicolons, etc.)
- `refactor`: code changes that neither fix a bug nor add a feature
- `test`: adding or updating tests
- `chore`: maintenance tasks

Example:

```
feat(auth): add login page with OAuth support
```

---

## Branching Strategy

- **Mainline**: `main` (protected, CI passes only)
- **Feature branches**: `feat/<short-description>`
- **Bugfix branches**: `fix/<short-description>`
- **Hotfix branches**: `hotfix/<short-description>`

Create a branch from `main`, develop your changes, and keep it up to date by rebasing or merging `main` before opening a PR.

---

## Pull Request Guidelines

1. **Scope** – A PR should address a single logical change (one feature, one bug, etc.).
2. **Title** – Use the Conventional Commits format (type, optional scope, concise description).
3. **Description** – Explain *what* and *why* the change was made. Reference any relevant issue numbers (e.g., `Fixes #123`).
4. **Tests** – Add or update tests to cover new behavior. All tests must pass.
5. **Lint** – Ensure the code passes `npm run lint`.
6. **Review** – Request at least one reviewer. Address review comments before merging.
7. **Merge** – Use the **Squash and merge** strategy to keep a clean history.

---

## Additional Resources

- [Project README](README.md) — stack, scripts and route overview.
- [Routes](docs/routes.md) — routes and endpoints per page (Spanish).
- [Project Structure](docs/project-structure.md) — folder responsibilities (Spanish).
- [Backend requirements](docs/backend-requirements.md) — the confirmed backend API contract and the requests the backend has since resolved.

---

Happy coding!
