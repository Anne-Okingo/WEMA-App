# Applications

This directory contains all independently runnable WEMA applications.

| Application | Path | Description |
|---|---|---|
| Patient App | `apps/frontend/patient-app/` | Offline-first tablet screening application for patients |
| Psychologist Portal | `apps/frontend/psychologist-portal/` | Clinical operations portal for psychologists |
| API | `apps/backend/api/` | Backend REST API used by the frontend applications |
| Worker | `apps/backend/worker/` | Background job processor for asynchronous work |

The frontend applications run directly on the developer machine during active development.

The backend API and Worker are separate applications and will run as separate services. Application directories should be added when their respective scaffold issues are implemented.
