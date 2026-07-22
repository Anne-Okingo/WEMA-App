# WEMA Frontend

This folder contains the npm workspaces for the WEMA frontend applications.

## Workspaces

- `@wema/patient-app` — Patient-facing screening application
- `@wema/psychologist-portal` — Psychologist operations portal

## Commands

Run from the repository root using npm workspace flags:

```bash
# Run all frontend dev servers in parallel
npm run dev --workspaces --if-present

# Run a single app
npm run dev --workspace=@wema/patient-app
npm run dev --workspace=@wema/psychologist-portal

# Build all frontend apps
npm run build

# Type-check both apps
npm run typecheck

# Lint both apps
npm run lint

# Format check both apps
npm run format:check

# Run all tests
npm test
```

## Prerequisites

- Node.js 20+
- npm 9+
