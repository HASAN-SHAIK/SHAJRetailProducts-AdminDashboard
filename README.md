# SHAJ NextGen Technologies - Admin Dashboard

Professional admin dashboard for the SHAJ NextGen Technologies SaaS platform. Built with React, React Router v6, Redux Toolkit, Axios, and Material UI.

## Features
- Tenant management (list, filters, create, details)
- Global subscription and revenue insights
- Feature flag management per tenant
- Reports with charts
- Payments and activity logs
- Plans management
- Protected admin routes
- Responsive layout

## Tech Stack
- React + Vite
- React Router v6
- Redux Toolkit
- Axios
- Material UI
- Recharts

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure API base URL (optional):

Create a `.env` file:

```bash
VITE_API_BASE_URL=http://localhost:5000
```

3. Start the dev server:

```bash
npm run dev
```

## API Endpoints Used
- `GET /platform/tenants`
- `GET /platform/tenant/:id`
- `POST /platform/create-tenant`
- `PATCH /platform/update-tenant/:id`
- `GET /platform/subscriptions`
- `GET /platform/reports`
- `GET /platform/subscription-payments`
- `GET /platform/platform-activity-logs`
- `GET /platform/plans`
- `PATCH /platform/plans/:id`

## Notes
- Auth token is stored in `localStorage` under `shaj_admin_token`.
- Adjust API endpoints in `src/api/*.js` to match your backend.

## Folder Structure

```
src/
  api/
  app/
  components/
    common/
    layout/
  features/
    auth/
    tenants/
    dashboard/
    reports/
    payments/
    logs/
    plans/
  pages/
  theme.js
  main.jsx
  App.jsx
```
