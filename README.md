# WEMA-App

WEMA is an offline-first maternal mental health screening app for hospital waiting rooms. Patients complete an EPDS assessment on a tablet, get instant results, and are automatically routed to care.

## Prerequisites

- Docker and Docker Compose (recommended — runs the full backend stack)
- Node.js >= 24 and pnpm >= 11 (for local development without Docker)

---

## Quick start with Docker

The recommended way to run the backend locally. Starts PostgreSQL, runs migrations, and starts the API in one command.

```bash
# 1. Copy the example env file (only needed once)
cp .env.example .env

# 2. Build images and start all services
docker compose up --build
```

The API will be available at `http://localhost:3001/api/status`.
PostgreSQL is exposed on `localhost:5434` (user: `wema`, password: `wema`, database: `wema_dev`).

| Service | URL |
|---|---|
| API | `http://localhost:3001` |
| Patient App | `http://localhost:5173` |
| Psychologist Portal | `http://localhost:5174` |

```bash
docker compose up --build        # build images and start all services
docker compose up -d             # start in the background
docker compose logs -f api       # stream API logs
docker compose down              # stop and remove containers
docker compose down -v           # also remove the postgres volume (resets database)
```

---

## Backend API — local development (without Docker)

### Setup

```bash
pnpm install
```

### Development

```bash
pnpm --filter @wema/api dev
```

The API starts on port `3000` by default. Set `API_PORT` in `.env` to change it.

### Build

```bash
pnpm --filter @wema/api build
```

### Start (compiled output)

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

---

## Database

Prisma is configured in `packages/database`. Run these from the repo root.

```bash
# Regenerate the Prisma client after schema changes
pnpm --filter @wema/database db:generate

# Create and apply a new development migration
pnpm --filter @wema/database db:migrate:dev

# Apply pending migrations (CI / production)
pnpm --filter @wema/database db:migrate:deploy

# Show migration status
pnpm --filter @wema/database db:migrate:status

# Open Prisma Studio
pnpm --filter @wema/database db:studio
```

---

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. Never commit `.env`.

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `API_PORT` | `3000` | Port the API listens on |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `DATABASE_TEST_URL` | — | Separate PostgreSQL database for the test suite |
| `LOG_LEVEL` | `info` | Minimum log level |
| `JWT_SECRET` | — | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | `15m` | JWT access token lifetime |
| `JOB_QUEUE_SCHEMA` | `wema_jobs` | PostgreSQL schema for the job queue |
| `WONDER_ENABLED` | `false` | Enable Wonder HMIS integration |
| `WHATSAPP_ENABLED` | `false` | Enable WhatsApp notification integration |
