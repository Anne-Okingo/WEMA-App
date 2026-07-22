# WEMA Frontend

This folder contains the pnpm workspaces for the WEMA frontend applications.

## Workspaces

- `@wema/patient-app` — Patient-facing screening application
- `@wema/psychologist-portal` — Psychologist operations portal

## Commands

Run from the repository root using pnpm workspace filters:

```bash
# Run all frontend dev servers in parallel
pnpm run dev

# Run a single app
pnpm --filter @wema/patient-app run dev
pnpm --filter @wema/psychologist-portal run dev

# Build all frontend apps
pnpm run build

# Type-check both apps
pnpm run typecheck

# Lint both apps
pnpm run lint

# Format check both apps
pnpm run format:check

# Run all tests
pnpm test
```

## Prerequisites

- Node.js 24+
- pnpm 11.15.1
