# Contributing to Ascent BIA Frontend

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

We use Node.js (>=18) and Yarn. Install the required tools and project dependencies:
```bash
# Install Node.js if you don't have it
# Install Yarn globally
npm install -g yarn

# Install project dependencies
yarn install
```

---

## Running the Development Server

```bash
yarn dev
```
This starts the Next.js development server with hot‑reloading. Open `http://localhost:3000` in your browser.

---

## Testing

We use **Jest** and **React Testing Library**.
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch
```
Make sure new code is covered by tests and that the existing test suite passes before opening a PR.

---

## Linting & Formatting

ESLint and Prettier are configured. Run them locally before committing:
```bash
# Lint only
yarn lint

# Fix lint errors automatically
yarn lint:fix

# Check formatting
yarn format:check

# Apply Prettier formatting
yarn format
```
All CI jobs will fail on lint or formatting errors.

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
Use the provided commit script to help format messages:
```bash
yarn commit
```

---

## Branching Strategy

- **Mainline**: `main` (protected, CI passes only)
- **Feature branches**: `feat/<short-description>`
- **Bugfix branches**: `fix/<short-description>`
- **Hotfix branches**: `hotfix/<short-description>`

Create a branch from `main`, develop your changes, and keep it up‑to‑date by rebasing or merging `main` before opening a PR.

---

## Pull Request Guidelines

1. **Scope** – A PR should address a single logical change (one feature, one bug, etc.).
2. **Title** – Use the Conventional Commits format (type, optional scope, concise description).
3. **Description** – Explain *what* and *why* the change was made. Reference any relevant issue numbers (e.g., `Fixes #123`).
4. **Tests** – Add or update tests to cover new behavior. All tests must pass.
5. **Lint** – Ensure the code passes `yarn lint` and `yarn format:check`.
6. **Review** – Request at least one reviewer. Address review comments before merging.
7. **Merge** – Use the **Squash and merge** strategy to keep a clean history.

---

## Additional Resources

- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Local Development Docs](docs/development.md) *(if exists)*

---

Happy coding!
