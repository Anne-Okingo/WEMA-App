# WEMA-App

WEMA is an offline-first maternal mental health screening app for hospital waiting rooms. Patients complete an EPDS assessment on a tablet, get instant results, and are automatically routed to care.

## Prerequisites

- Node.js >= 24
- pnpm >= 11

## Backend API

The backend REST API lives at `apps/backend/api`.

### Setup

```bash
# Install all workspace dependencies from the repo root
npm install -g pnpm
pnpm install
```

### Development

```bash
# Run the API in watch mode (restarts on file changes)
pnpm --filter @wema/api dev
```

The API starts on port `3000` by default. Set the `PORT` environment variable to use a different port.

```bash
PORT=4000 pnpm --filter @wema/api dev
```

### Build

```bash
pnpm --filter @wema/api build
```

### Start (production build)

```bash
pnpm --filter @wema/api start
```

### Type-check

```bash
pnpm --filter @wema/api typecheck
```

### Test

```bash
pnpm --filter @wema/api test
```

### Status route

```
GET /api/status  →  200 { "status": "ok" }
```

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. Never commit `.env`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the API listens on |
| `NODE_ENV` | `development` | Runtime environment |
