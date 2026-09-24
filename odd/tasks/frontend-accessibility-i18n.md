# Frontend Accessibility and Internationalization

## Overview

This task adds basic accessibility (WCAG) improvements and sets up internationalization using **next-i18next** (via a lightweight `i18n.ts` configuration).

### ARIA Enhancements
- `HealthStatus` now announces status changes with `aria-live="polite"` and `role="status"`.
- `MeterDetail` wraps the description list in an `aria-live` region.
- `MeterList` includes an `aria-label="Meter list"` on the Ant Design `List` component.
- `Analyzer` Card is marked as a live region (`role="region" aria-live="polite"`).
- `ChartPanel` gains an `aria-label` and `role="img"` for the chart container.
- `MeterCard` receives `role="region"` with a descriptive `aria-label`.
- `ToolProof` now has `aria-live="polite"` and `role="region"`.

### Contrast
- Added `$high-contrast-color` SCSS variable (black) to guarantee sufficient contrast for text against the white background.

### Internationalization
- Created `frontend/src/i18n.ts` with a basic **i18next** initialization suitable for Next.js projects.
- Supports English (`en`) and Spanish (`es`) locales, ready for further translation keys.

## Documentation Updates
- Updated `frontend/README.md` with a brief note about accessibility and i18n support.
- Added this task markdown under `odd/tasks/frontend-accessibility-i18n/` for tracking.
