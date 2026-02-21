# Playwright + TypeScript Automation Framework

Structure follows a layered architecture where only `src/core/ElementActions.ts` depends on Playwright.

Key folders:
- `src/pages` — locators only
- `src/core` — Playwright-dependent adapter
- `src/flows` — business flows using `actions` + `pages`
- `src/preconditions` — reusable test preconditions
- `src/fixtures` — Playwright fixtures injecting `actions` and `pages`
- `tests` — thin tests using flows and preconditions

Run tests:
```
npm install
npx playwright install --with-deps
npm test
```

Allure report

1. Generate after a test run:

```bash
npm run allure:generate
```

2. Open the generated report:

```bash
npm run allure:open
```

CI

There's a GitHub Actions workflow at `.github/workflows/playwright.yml` that runs tests and uploads `playwright-report`, `test-results` and `allure-results` as CI artifacts.
