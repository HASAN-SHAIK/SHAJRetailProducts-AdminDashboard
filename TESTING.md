## Testing Prototype (UI + API + Unit/Component)

This repo includes a testing prototype with:
- **Playwright**: E2E UI flows + API checks
- **Vitest + Testing Library**: unit and component tests for React

### 1) Install dependencies

```bash
npm install
npx playwright install --with-deps
```

On Windows, `--with-deps` is optional; keep it if CI/Linux runners are used.

### 2) Run the dev server

Playwright config will auto-start `npm run dev`. You can also run manually:

```bash
npm run dev
```

### 3) Run tests

- Unit/Component (Vitest, jsdom):
```bash
npm test
```

- E2E headless:
```bash
npm run test:e2e
```

- E2E UI mode:
```bash
npm run test:e2e:ui
```

- View last HTML report:
```bash
npm run test:e2e:report
```

### 4) Structure

- `playwright.config.js` — Playwright configuration (server, baseURL, retries, reporters)
- `tests/e2e/*.spec.js` — E2E + API tests
  - `smoke.spec.js` — login redirect, dashboard access, sidebar navigation
  - `api.spec.js` — mocked login API + example direct API request
- `vitest.config.js` — Vitest config (jsdom env, setup)
- `src/setupTests.js` — global test setup for Testing Library (`jest-dom`)
- `tests/unit/*.test.js` — unit tests (e.g., `date.test.js`)
- `tests/component/*.test.jsx` — component tests (e.g., `LoadingSpinner.test.jsx`)

### 5) Environment variables

- UI base URL: set `E2E_BASE_URL` to override `http://localhost:5173`.
- Example API base: set `API_BASE_URL` to point API tests at a real test server.

### 6) Notes on API tests

- The prototype stubs `/api/admin/login` via `page.route` to validate UI behavior without a backend.
- For direct API calls (using `request`), set `API_BASE_URL` to a reachable backend in CI.

---

## Where to keep test code?

Short answer: **keep tests in this repo**.

- **Pros (same repo)**:
  - Always in sync with UI code and routes
  - Simpler local dev: `npm install && npm run test:e2e`
  - Easier PR review: code + tests together
  - One CI pipeline
- **Cons**:
  - App and tests share node_modules (slightly bigger install)

Use a **separate repo** only if:
- Multiple apps share a cross-cutting E2E suite
- You need to test black-box production flows against many independent services, versioned separately
- Independent release cadence for tests (rare)

For this Admin dashboard, same-repo testing is recommended.

