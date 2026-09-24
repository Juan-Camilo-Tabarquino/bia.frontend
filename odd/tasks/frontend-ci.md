# Frontend CI Task

## Objective
Set up a GitHub Actions CI workflow that runs on every push to `main`/`master` and on pull requests. The workflow should:
- Checkout the repository.
- Set up Node.js (version 20).
- Install dependencies.
- Run lint using `npm run lint`.
- Execute tests with `npm test`.
- Build the Next.js application using `npm run build`.

## Files Added / Modified
- `.github/workflows/ci.yml` – defines the CI jobs.
- `README.md` – badge displaying CI status.

## Validation
Running the workflow on GitHub should produce a passing badge. Locally, the commands `npm ci`, `npm run lint`, `npm test`, and `npm run build` should all succeed.

## Tracking
Recorded in the ODD task system under `odd/tasks/frontend-ci.md`.