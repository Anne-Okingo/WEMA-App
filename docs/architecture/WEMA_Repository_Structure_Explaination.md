# WEMA Repository Structure 

## 1. Purpose of This Document

This handbook explains the WEMA monorepo in the same order that a developer or will encounter it. It describes the purpose of each major folder and important file, how the sections connect, and who primarily owns each area.

The structure supports four runnable applications:

1. Patient App
2. Psychologist Portal
3. Backend API
4. Background Worker

It also supports two clinical workflows:

- EPDS integrated with Wonder
- General Public PHQ-2 and conditional PHQ-9, owned by WEMA

The most important rule is:

> `apps/` contains things that run; `packages/` contains code shared by the things that run.

---

# 2. Repository Overview

```text
wema/
├── apps/
├── packages/
├── content/
├── infrastructure/
├── docs/
├── scripts/
├── .github/
└── root configuration files
```

| Part | Plain-language meaning | Main responsibility | Primary owner |
|---|---|---|---|
| `apps/` | WEMA applications | Holds the Patient App, Psychologist Portal, API, and Worker | Frontend and Backend Developers |
| `packages/` | Shared libraries | Holds contracts, scoring, clinical rules, database access, testing helpers, and UI components | Developers |
| `content/` | Patient-facing and clinical content | Holds translations, audio, video, and approved messages | Clinical Lead, Content Team, Frontend Developer |
| `infrastructure/` | Deployment and operations | Holds Docker, deployment, monitoring, backups, and security setup | QA/DevOps Engineer |
| `docs/` | Written system knowledge | Holds architecture, workflow, clinical, privacy, testing, and operational guides | Technical PM and functional owners |
| `scripts/` | Repeatable commands | Automates setup, database, content, test, and maintenance operations | Developers and DevOps |
| `.github/` | GitHub automation | Holds CI/CD workflows, review ownership, and collaboration templates | QA/DevOps and Technical PM |

---

# 3. Root Repository

## 3.1 Root Folder and File Table

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `apps/` | Contains all independently runnable WEMA applications | Frontend and Backend Developers |
| `packages/` | Contains code reused across applications | Developers |
| `content/` | Contains multilingual text, audio, and clinical messages | Clinical and Content Teams |
| `infrastructure/` | Contains deployment, monitoring, backup, and security setup | QA/DevOps |
| `docs/` | Contains technical and operational documentation | Technical PM and Technical Leads |
| `scripts/` | Contains utility commands for repeatable work | Developers and QA/DevOps |
| `.github/` | Contains GitHub Actions and team workflow rules | QA/DevOps and Technical PM |
| `.env.example` | Lists required environment variables without containing secrets | Backend and DevOps |
| `.gitignore` | Prevents secrets, build output, local databases, and temporary files from being committed | All Developers |
| `docker-compose.yml` | Starts local backend services such as PostgreSQL, API, Worker, and queue dependencies | Backend and DevOps |
| `package.json` | Defines npm workspaces, repository scripts, and root dependencies | frontend |
| `package-lock.json` | Locks exact npm dependency versions | frontend |
| `tsconfig.base.json` | Shared TypeScript rules for applications and packages | Frontend |
| `vitest.workspace.ts` | Connects unit and integration test projects | QA and Developers |
| `playwright.config.ts` | Defines browser end-to-end testing settings | QA Engineer |
| `eslint.config.js` | Defines code-quality rules | QA Engineer |
| `prettier.config.js` | Defines formatting rules | QA Engineer |
| `CONTRIBUTING.md` | Explains branches, commits, tests, pull requests, and review rules | Technical PM  |
| `README.md` | Main guide for understanding, installing, and running WEMA | Technical PM  |

## 3.2 What the Root Does Not Contain

The root should not contain screening logic, React screens, database queries, or Wonder API code. It coordinates the monorepo through shared commands and configuration.

---

# 4. Applications Folder

```text
apps/
├── frontend/
│   ├── patient-app/
│   └── psychologist-portal/
└── backend/
    ├── api/
    └── worker/
```

| Application | What it does | Direct user | Primary owner |
|---|---|---|---|
| Patient App | Guides patients through screening | Patient | Frontend Developer |
| Psychologist Portal | Supports clinical operations | Psychologist | Frontend Developer |
| Backend API | Validates and stores data; serves both frontends | No direct human user | Backend Developer |
| Worker | Handles background and retryable tasks | No direct human user | Backend Developer |

---

# 5. Patient App

```text
apps/frontend/patient-app/
```

The Patient App is the tablet-facing self-screening application. It must work when the internet is unavailable and synchronize later.

## 5.1 Patient App Top Level

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `src/` | Contains Patient App source code | Frontend Developer |
| `public/` | Contains static browser files such as icons and offline fallback assets | Frontend Developer |
| `tests/` | Contains cross-feature integration and end-to-end tests | QA and Frontend Developer |
| `vite.config.ts` | Configures development server and production build | Frontend Developer |
| `tsconfig.json` | Patient App TypeScript configuration | Frontend Developer |
| `package.json` | Patient App dependencies and scripts | Frontend Developer |

---

# 6. Patient App Application Startup

```text
patient-app/src/app/
```

| File | Purpose / Details | Primary owner |
|---|---|---|
| `App.tsx` | Root React component that combines providers, routes, and application layout | Frontend Developer |
| `routes.tsx` | Maps URLs and workflow steps to screens | Frontend Developer |
| `providers.tsx` | Registers global services such as i18n, query state, offline database access, and configuration | Frontend Developer |
| `workflow-entry.ts` | Selects the correct workflow using route, device, facility, and backend configuration | Frontend Developer |
| `startup.ts` | Opens IndexedDB, loads device identity, registers Service Worker, checks connectivity, and starts synchronization | Frontend Developer |
| `error-boundary.tsx` | Catches unexpected UI errors and displays a safe recovery screen | Frontend and QA |

### Startup sequence

```text
main.tsx
→ startup.ts
→ providers.tsx
→ App.tsx
→ routes.tsx
→ workflow-entry.ts
```

---

# 7. Patient App Workflows

```text
patient-app/src/workflows/
├── epds-wonder/
└── general-public-phq/
```

A workflow is the complete patient journey. It is broader than a questionnaire.

| Workflow | Patient source | Screening | Data destination | Follow-up owner |
|---|---|---|---|---|
| EPDS–Wonder | Wonder patient list | EPDS | WEMA and Wonder | Wonder / hospital |
| General Public PHQ | WEMA registration | PHQ-2 and conditional PHQ-9 | WEMA only | WEMA psychologists |

## 7.1 EPDS–Wonder Workflow

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `epds-wonder.routes.tsx` | Defines the route order for the EPDS journey | Frontend Developer |
| `epds-wonder.workflow.ts` | Defines workflow metadata, ownership, and allowed steps | Frontend and Backend Developers |
| `epds-wonder.types.ts` | Defines frontend-only workflow state | Frontend Developer |
| `screens/` | Contains screens used only by EPDS–Wonder | Frontend Developer |
| `hooks/` | Contains React hooks used only by EPDS–Wonder | Frontend Developer |
| `tests/` | Tests workflow sequence and workflow-specific behavior | Frontend and QA |

```text
Language
→ Wonder patient identification
→ EPDS
→ Score
→ Classification
→ Result
→ Routing
→ Room or queue
→ Save locally
→ Sync to WEMA
→ Push result to Wonder
```

## 7.2 General Public PHQ Workflow

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `general-public-phq.routes.tsx` | Defines the route order for the General Public journey | Frontend Developer |
| `general-public-phq.workflow.ts` | Defines WEMA ownership and PHQ workflow steps | Frontend and Backend Developers |
| `general-public-phq.types.ts` | Defines frontend-only state for this workflow | Frontend Developer |
| `screens/` | Contains workflow-specific screens | Frontend Developer |
| `hooks/` | Contains workflow-specific hooks | Frontend Developer |
| `tests/` | Tests PHQ-2 continuation, PHQ-9, routing, and completion | Frontend and QA |

```text
Language
→ Consent
→ WEMA registration
→ PHQ-2
→ Continuation decision
→ PHQ-9 when required
→ Score
→ Classification
→ Routing
→ Room or queue
→ Consultation
→ Follow-up scheduling
```

---

# 8. Patient App Shared Features

```text
patient-app/src/features/
```

Features are reusable building blocks used by one or both workflows.

| Feature | Purpose / Details | Primary owner |
|---|---|---|
| `language/` | Lets the patient choose English, Kiswahili, or Luo | Frontend and Content Team |
| `consent/` | Displays approved consent and captures the patient’s decision only for PHQ2 | Frontend and Clinical Lead |
| `wonder-patient-identification/` | Searches the locally cached Wonder patient list | Frontend Developer |
| `wema-patient-registration/` | Captures General Public patient details for a WEMA-owned record | Frontend Developer |
| `screening-runner/` | Displays questions, answers, progress, validation, and resume behavior | Frontend Developer |
| `results/` | Shows the score, approved interpretation, and next step | Frontend and Clinical Lead |
| `routing/` | Displays the routing outcome selected by clinical rules | Frontend Developer |
| `room-assignment/` | Shows assigned psychologist and room | Frontend Developer |
| `waiting-queue/` | Shows queue state and waiting instructions | Frontend Developer |
| `psychoeducation/` | Shows approved educational content while waiting | Frontend and Clinical Team |
| `media/audio/` | Plays approved spoken content | Frontend and Content Team |
| `media/text/` | Displays approved text content | Frontend and Content Team |
| `session-reset/` | Ends the patient session safely without deleting unsynchronized records | Frontend and QA |

### Workflow versus feature

| Concept | Meaning | Example |
|---|---|---|
| Workflow | Complete sequence | EPDS–Wonder journey |
| Feature | Reusable capability | Consent |
| Screen | Visible page | Consent page |
| Hook | Reusable React behavior | `useAssessmentSession()` |

---

# 9. Patient App Local-First Infrastructure

```text
patient-app/src/offline/
```

This is the technical foundation that allows the tablet to continue screening when internet access is unavailable.

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `database/` | Creates and upgrades the local IndexedDB database | Frontend Developer |
| `repositories/` | Provides controlled functions for reading and writing local data | Frontend Developer |
| `outbox/` | Stores actions that must be delivered later | Frontend and Backend Developers |
| `synchronization/` | Pushes local changes and pulls server updates | Frontend and Backend Developers |
| `connectivity/` | Detects whether the WEMA API is reachable | Frontend Developer |
| `service-worker/` | Caches application files and content for offline loading | Frontend and DevOps |

## 9.1 Local Database

| File/Folder | Purpose / Details | Primary owner |
|---|---|---|
| `database.ts` | Creates the Dexie database instance | Frontend Developer |
| `schema.ts` | Defines local tables, fields, and indexes | Frontend Developer |
| `table-names.ts` | Centralizes local table names | Frontend Developer |
| `migrations/` | Safely upgrades older tablet database versions | Frontend and QA |

Possible local tables include patients, screening sessions, assessments, answers, routing decisions, psychologists, rooms, queue entries, outbox items, sync state, and content versions.

## 9.2 Local Repositories

| File | Purpose / Details | Primary owner |
|---|---|---|
| `patient.repository.ts` | Saves and retrieves patient records locally | Frontend Developer |
| `session.repository.ts` | Saves and resumes screening sessions | Frontend Developer |
| `assessment.repository.ts` | Stores answers and completed assessments | Frontend Developer |
| `resource.repository.ts` | Stores rooms, psychologists, queue data, and content metadata | Frontend Developer |
| `outbox.repository.ts` | Stores and retrieves pending operations | Frontend Developer |

Screens should use repositories rather than access IndexedDB directly.

## 9.3 Outbox

| File | Purpose / Details | Primary owner |
|---|---|---|
| `outbox.types.ts` | Defines the structure of a pending operation | Frontend and Backend Developers |
| `outbox.factory.ts` | Creates valid outbox records | Frontend Developer |
| `outbox.processor.ts` | Sends pending records when connectivity returns | Frontend Developer |
| `retry-policy.ts` | Defines retry timing | Frontend and QA |
| `outbox-status.ts` | Defines pending, processing, completed, failed, and blocked states | Frontend Developer |

```text
Assessment completed offline
→ Saved locally
→ Upload operation added to outbox
→ Internet returns
→ Outbox processor sends it
→ API confirms receipt
→ Outbox item marked completed
```

## 9.4 Synchronization

| File | Purpose / Details | Primary owner |
|---|---|---|
| `push-sync.ts` | Sends tablet-created records to WEMA | Frontend and Backend Developers |
| `pull-sync.ts` | Downloads patient cache, rooms, psychologists, queue updates, content, and configuration | Frontend and Backend Developers |
| `sync-engine.ts` | Coordinates push and pull operations | Frontend Developer |
| `conflict-policy.ts` | Decides how local and server differences are handled | Frontend and Backend Developers |
| `sync-status.ts` | Tracks idle, running, success, and failure states | Frontend Developer |
| `sync-errors.ts` | Defines synchronization-specific errors | Frontend Developer |

## 9.5 Connectivity

| File | Purpose / Details | Primary owner |
|---|---|---|
| `connectivity.service.ts` | Calls a WEMA health endpoint to confirm real connectivity | Frontend Developer |
| `use-connectivity.ts` | Makes connectivity state available to React components | Frontend Developer |

## 9.6 Service Worker

| File | Purpose / Details | Primary owner |
|---|---|---|
| `register-service-worker.ts` | Registers the Service Worker | Frontend Developer |
| `cache-policy.ts` | Defines which app and content files are cached | Frontend and QA |
| `update-policy.ts` | Defines how updates are installed safely | Frontend and DevOps |

The Service Worker caches application files. IndexedDB stores clinical and operational data.

---

# 10. Patient App Device Management

```text
patient-app/src/device/
```

Patients do not log in. The tablet is registered as an approved WEMA device.

| File | Purpose / Details | Primary owner |
|---|---|---|
| `device-identity.ts` | Stores the non-secret device identifier | Frontend and Backend Developers |
| `credential-storage.ts` | Stores the device credential | Frontend Developer |
| `device-registration.ts` | Registers or re-registers a tablet | Frontend and Backend Developers |
| `device-status.ts` | Tracks active, revoked, replaced, or pending state | Frontend and Backend Developers |

---

# 11. Patient App API, Shared Code, and Languages

## 11.1 API Folder

| File | Purpose / Details | Primary owner |
|---|---|---|
| `client.ts` | Creates the HTTP client used to call WEMA | Frontend Developer |
| `interceptors.ts` | Adds device credentials, headers, and request IDs | Frontend Developer |
| `endpoints.ts` | Central list of API paths | Frontend Developer |
| `errors.ts` | Maps API failures into safe application behavior | Frontend Developer |

The Patient App must not call Wonder directly.

## 11.2 Shared Code

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `components/` | Components used by several Patient App features | Frontend Developer |
| `hooks/` | Hooks reused across several features | Frontend Developer |
| `layouts/` | Reusable screen layouts | Frontend and UI/UX |
| `utils/` | Small helper functions | Frontend Developer |
| `constants/` | Shared constant values | Frontend Developer |

## 11.3 i18n

| File | Purpose / Details | Primary owner |
|---|---|---|
| `config.ts` | Configures `react-i18next` | Frontend Developer |
| `language.types.ts` | Defines supported language codes | Frontend Developer |
| `resource-loader.ts` | Loads content translations | Frontend Developer |

---

# 12. Psychologist Portal

```text
apps/frontend/psychologist-portal/
```

The Psychologist Portal is the authenticated clinical operations interface.

## 12.1 Main Areas

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `src/app/` | Starts the portal and protects routes | Frontend Developer |
| `src/features/` | Contains psychologist-facing capabilities | Frontend Developer |
| `src/api/` | Communicates with the backend | Frontend Developer |
| `src/auth/` | Manages login session and authorization state | Frontend Developer |
| `src/shared/` | Contains shared portal UI and helpers | Frontend Developer |
| `src/i18n/` | Configures portal languages | Frontend Developer |
| `tests/` | Contains integration and E2E tests | QA and Frontend Developer |

## 12.2 Portal App Files

| File | Purpose / Details | Primary owner |
|---|---|---|
| `App.tsx` | Root portal component | Frontend Developer |
| `routes.tsx` | Defines portal pages | Frontend Developer |
| `providers.tsx` | Registers portal-wide services and state | Frontend Developer |
| `startup.ts` | Restores session and loads operational data | Frontend Developer |
| `protected-route.tsx` | Blocks unauthenticated access | Frontend Developer |
| `error-boundary.tsx` | Handles unexpected UI crashes | Frontend and QA |

## 12.3 Portal Features

| Feature | Purpose / Details | Primary owner |
|---|---|---|
| `authentication/` | Login and logout | Frontend and Backend Developers |
| `profile/` | Displays psychologist profile | Frontend Developer |
| `shift/` | Starts and ends a work shift | Frontend and Backend Developers |
| `availability/` | Sets available, busy, on break, or offline | Frontend and Backend Developers |
| `rooms/` | Displays or changes approved room assignment | Frontend and Backend Developers |
| `queue/` | Displays waiting patients | Frontend and Backend Developers |
| `assignments/` | Shows patients assigned to the psychologist | Frontend and Backend Developers |
| `consultations/` | Starts and completes consultations | Frontend and Backend Developers |
| `scheduling/` | Schedules General Public follow-up appointments | Frontend and Backend Developers |

## 12.4 Portal API and Authentication

| File | Purpose / Details | Primary owner |
|---|---|---|
| `api/client.ts` | Creates the portal HTTP client | Frontend Developer |
| `api/auth.api.ts` | Calls authentication endpoints | Frontend Developer |
| `api/operations.api.ts` | Calls shift, availability, room, queue, assignment, and consultation endpoints | Frontend Developer |
| `api/scheduling.api.ts` | Calls scheduling endpoints | Frontend Developer |
| `api/errors.ts` | Handles API errors | Frontend Developer |
| `auth/token-storage.ts` | Stores the active authentication token | Frontend Developer |
| `auth/session.ts` | Restores and clears the session | Frontend Developer |
| `auth/authorization.ts` | Controls frontend permission checks | Frontend Developer |

The backend must still enforce authorization even when the frontend hides a control.

---

# 13. Backend API

```text
apps/backend/api/
```

The API is the central server-side application used by both frontends and the Worker.

## 13.1 API Main Structure

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `src/app/` | Starts and stops the API | Backend Developer |
| `src/modules/` | Contains backend capabilities | Backend Developer |
| `src/workflows/` | Enforces workflow ownership and boundaries | Backend and Clinical Lead |
| `src/integrations/` | Connects to Wonder and WhatsApp | Backend Developer |
| `src/middleware/` | Handles authentication, validation, logs, and errors | Backend Developer |
| `src/config/` | Loads runtime configuration | Backend and DevOps |
| `src/shared/` | Holds backend code shared by several modules | Backend Developer |
| `tests/` | Holds unit, integration, API, and contract tests | Backend and QA |
| `Dockerfile` | Builds the API container | Backend and DevOps |

## 13.2 API App Files

| File | Purpose / Details | Primary owner |
|---|---|---|
| `app.ts` | Creates the Express app | Backend Developer |
| `server.ts` | Starts the HTTP server | Backend Developer |
| `routes.ts` | Registers module routes | Backend Developer |
| `startup.ts` | Connects database, queue, logging, and dependencies | Backend Developer |
| `shutdown.ts` | Closes resources safely | Backend and DevOps |

---

# 14. Backend Modules

| Module | Purpose / Details | Primary owner |
|---|---|---|
| `authentication/` | Login, password verification, JWT creation, token lifecycle | Backend Developer |
| `users/` | Internal WEMA users and roles | Backend Developer |
| `devices/` | Tablet registration, credentials, revocation, and facility assignment | Backend Developer |
| `facilities/` | Hospital and facility records | Backend Developer |
| `patients/` | Wonder-linked patient references and WEMA-owned General Public patients | Backend Developer |
| `consent/` | Stores consent version, language, time, workflow, device, and facility | Backend and Clinical Lead |
| `screening-sessions/` | Tracks each complete screening encounter | Backend Developer |
| `assessments/` | Stores answers, scores, and rule versions | Backend and Clinical Lead |
| `psychologists/` | Psychologist profiles and facility relationships | Backend Developer |
| `availability/` | Authoritative psychologist availability | Backend Developer |
| `rooms/` | Consultation rooms and status | Backend Developer |
| `queue/` | Authoritative patient queue | Backend Developer |
| `assignments/` | Patient-to-psychologist and room assignments | Backend Developer |
| `consultations/` | Consultation start, completion, and approved outcomes | Backend Developer |
| `scheduling/` | General Public follow-up appointments | Backend Developer |
| `synchronization/` | Receives tablet push and pull requests | Backend Developer |
| `notifications/` | Creates approved General Public notification tasks | Backend Developer |
| `media/` | Provides content manifest and media metadata | Backend Developer |
| `audit/` | Records who performed sensitive actions and what changed | Backend Developer |
| `system-configuration/` | Stores enabled workflows, languages, rooms, closing times, and active content version | Backend and Technical PM |
| `health/` | Reports process, database, and queue health | Backend and DevOps |

---

# 15. Backend Workflow Validation

```text
api/src/workflows/
```

| File | Purpose / Details | Primary owner |
|---|---|---|
| `workflow-registry.ts` | Lists supported workflows | Backend Developer |
| `workflow.types.ts` | Defines workflow metadata | Backend Developer |
| `workflow-validator.ts` | Rejects invalid workflow operations | Backend and Clinical Lead |
| `epds-wonder.workflow.ts` | Defines EPDS ownership and Wonder integration rules | Backend and Clinical Lead |
| `general-public-phq.workflow.ts` | Defines WEMA ownership, PHQ continuation, and follow-up rules | Backend and Clinical Lead |

This layer should reject PHQ data targeting Wonder, an EPDS alert sent through WEMA WhatsApp, or a General Public record incorrectly marked as Wonder-owned.

---

# 16. Backend Integrations

## 16.1 Wonder

| File | Purpose / Details | Primary owner |
|---|---|---|
| `wonder.client.ts` | Sends HTTP requests to Wonder | Backend Developer |
| `wonder.auth.ts` | Handles Wonder authentication | Backend Developer |
| `wonder.config.ts` | Loads Wonder URLs and settings | Backend and DevOps |
| `wonder.types.ts` | Defines Wonder-specific request and response types | Backend Developer |
| `patient.mapper.ts` | Converts Wonder patient data to WEMA format | Backend Developer |
| `epds-result.mapper.ts` | Converts WEMA EPDS results to Wonder format | Backend Developer |
| `wonder.errors.ts` | Standardizes Wonder failures | Backend Developer |
| `tests/` | Tests mapping, errors, and integration behavior | Backend and QA |

## 16.2 WhatsApp

| File | Purpose / Details | Primary owner |
|---|---|---|
| `whatsapp.client.ts` | Calls the approved WhatsApp service | Backend Developer |
| `whatsapp.config.ts` | Loads provider settings | Backend and DevOps |
| `public-risk-alert.mapper.ts` | Builds approved General Public alert payloads | Backend and Clinical Lead |
| `whatsapp.errors.ts` | Standardizes provider failures | Backend Developer |
| `tests/` | Tests alert mapping and failure handling | Backend and QA |

---

# 17. Backend Middleware

| File | Purpose / Details | Primary owner |
|---|---|---|
| `authentication.middleware.ts` | Validates user tokens | Backend Developer |
| `device-auth.middleware.ts` | Validates registered tablet credentials | Backend Developer |
| `authorization.middleware.ts` | Checks roles and permissions | Backend Developer |
| `validation.middleware.ts` | Validates request schemas | Backend Developer |
| `request-id.middleware.ts` | Adds a correlation/request identifier | Backend Developer |
| `logging.middleware.ts` | Writes structured request logs | Backend Developer |
| `error-handler.middleware.ts` | Converts internal errors into safe API responses | Backend Developer |

---

# 18. Background Worker

```text
apps/backend/worker/
```

The Worker handles tasks that should happen in the background or may need retries.

## 18.1 Worker Jobs

| File | Purpose / Details | Primary owner |
|---|---|---|
| `refresh-wonder-patients.job.ts` | Refreshes the local Wonder patient cache | Backend Developer |
| `push-epds-to-wonder.job.ts` | Sends completed EPDS results to Wonder | Backend Developer |
| `send-general-public-whatsapp-alert.job.ts` | Sends approved WEMA-owned alerts | Backend Developer |
| `retry-failed-synchronization.job.ts` | Retries server-side sync failures | Backend Developer |
| `export-audit-events.job.ts` | Exports or archives audit events; it does not create the primary audit record | Backend and DevOps |

## 18.2 Worker Queue Files

| File | Purpose / Details | Primary owner |
|---|---|---|
| `queue-client.ts` | Connects to the queue system | Backend Developer |
| `queue-names.ts` | Defines approved queue names | Backend Developer |
| `retry-policy.ts` | Defines retry timing | Backend and QA |
| `idempotency.ts` | Prevents duplicate job effects | Backend Developer |
| `dead-letter-policy.ts` | Handles jobs that keep failing | Backend and DevOps |
| `worker.ts` | Starts job processing | Backend Developer |
| `startup.ts` | Initializes worker dependencies | Backend Developer |
| `shutdown.ts` | Stops job processing safely | Backend and DevOps |

---

# 19. Shared Packages

| Package | Purpose / Details | Primary owner |
|---|---|---|
| `application/` | Shared backend use cases used by API and Worker | Backend Developer |
| `assessment-tools/` | Defines EPDS, PHQ-2, and PHQ-9 | Developers and Clinical Lead |
| `contracts/` | Shared data schemas and types | Frontend and Backend Developers |
| `scoring/` | Calculates numerical scores | Developers and Clinical Lead |
| `clinical-rules/` | Classifies, applies safety rules, and chooses routing | Developers and Clinical Lead |
| `database/` | PostgreSQL, Prisma, repositories, transactions, and audit persistence | Backend Developer |
| `config/` | Shared typed configuration | Backend and DevOps |
| `observability/` | Logging, tracing, error monitoring, metrics, and redaction | Backend and DevOps |
| `testing/` | Shared fixtures, stubs, golden cases, and test database | QA and Developers |
| `ui/` | Shared React components and design tokens | Frontend and UI/UX |

---

# 20. Application Package

| Section | Purpose / Details | Primary owner |
|---|---|---|
| `patients/` | Register a WEMA patient and resolve a Wonder patient | Backend Developer |
| `consent/` | Record consent | Backend Developer |
| `assessments/` | Start, complete, and verify assessments | Backend and Clinical Lead |
| `routing/` | Route a patient after classification | Backend and Clinical Lead |
| `queue/` | Create queue entries and assign the next patient | Backend Developer |
| `consultations/` | Complete consultations | Backend Developer |
| `scheduling/` | Schedule follow-up | Backend Developer |
| `synchronization/` | Process sync batches and conflicts | Backend Developer |
| `integrations/` | Enqueue Wonder result pushes and General Public alerts | Backend Developer |

A use case is an action such as `complete-assessment`, `route-patient`, or `schedule-follow-up`.

---

# 21. Assessment Tools Package

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `common/` | Shared tool, answer, version, and content-reference types | Developers |
| `epds/` | EPDS definition, questions, answer options, interpretation, and exports | Developers and Clinical Lead |
| `phq2/` | PHQ-2 definition | Developers and Clinical Lead |
| `phq9/` | PHQ-9 definition | Developers and Clinical Lead |
| `definition.ts` | Tool identity, order, version, and metadata | Developers and Clinical Lead |
| `questions.ts` | Stable question identifiers and content keys | Developers and Clinical Lead |
| `answer-options.ts` | Stable answer choices and score values | Developers and Clinical Lead |
| `interpretation.ts` | Approved interpretation metadata | Clinical Lead |
| `index.ts` | Public package exports | Developers |

Translated wording should remain in `content/`, not in TypeScript.

---

# 22. Contracts Package

Contracts are the formal agreement between the Patient App, Portal, API, and Worker.

| Contract area | Purpose / Details | Primary owner |
|---|---|---|
| `common/` | Shared IDs, pagination, and timestamps | Frontend and Backend Developers |
| `patients/` | Patient data schemas | Frontend and Backend Developers |
| `consent/` | Consent schemas | Frontend and Backend Developers |
| `assessments/` | Assessment schemas | Frontend and Backend Developers |
| `screening-sessions/` | Screening encounter schemas | Frontend and Backend Developers |
| `routing/` | Routing result schemas | Frontend and Backend Developers |
| `queue/` | Queue schemas | Frontend and Backend Developers |
| `assignments/` | Assignment schemas | Frontend and Backend Developers |
| `consultations/` | Consultation schemas | Frontend and Backend Developers |
| `scheduling/` | Appointment schemas | Frontend and Backend Developers |
| `psychologists/` | Psychologist schemas | Frontend and Backend Developers |
| `facilities/` | Facility schemas | Frontend and Backend Developers |
| `devices/` | Device schemas | Frontend and Backend Developers |
| `api/` | Shared API responses and errors | Backend Developer |
| `events/` | Internal event schemas | Backend Developer |
| `jobs/` | Queue job envelope and payload schemas | Backend Developer |
| `synchronization/` | Push, pull, cursor, conflict, tombstone, and sync error schemas | Frontend and Backend Developers |
| `integrations/` | Wonder and WhatsApp boundary schemas | Backend Developer |

---

# 23. Scoring and Clinical Rules

## 23.1 Scoring

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `common/` | Shared score result and version types | Developers |
| `epds/` | Calculates EPDS score | Developers and Clinical Lead |
| `phq2/` | Calculates PHQ-2 score | Developers and Clinical Lead |
| `phq9/` | Calculates PHQ-9 score | Developers and Clinical Lead |
| `tests/` | Verifies expected scores for known answers | QA, Developers, Clinical Lead |

Scoring returns a number. It does not assign a room or send an alert.

## 23.2 Clinical Rules

| File/Folder | Purpose / Details | Primary owner |
|---|---|---|
| `common/clinical-rule.types.ts` | Shared rule types | Developers |
| `common/rule-version.ts` | Version identifier for rule releases | Developers and Clinical Lead |
| `common/routing-result.ts` | Standard routing result structure | Developers |
| `common/safety-invariants.ts` | Cross-workflow rules that must never be broken | Clinical Lead and Developers |
| `epds/classification.rules.ts` | Converts EPDS result into classification | Clinical Lead and Developers |
| `epds/routing.rules.ts` | Chooses EPDS routing outcome | Clinical Lead and Developers |
| `epds/safety.rules.ts` | Applies EPDS safety checks | Clinical Lead and Developers |
| `general-public-phq/phq2-continuation.rules.ts` | Decides whether PHQ-9 continues | Clinical Lead and Developers |
| `general-public-phq/classification.rules.ts` | Classifies PHQ result | Clinical Lead and Developers |
| `general-public-phq/routing.rules.ts` | Chooses General Public routing | Clinical Lead and Developers |
| `general-public-phq/safety.rules.ts` | Applies approved safety handling | Clinical Lead and Developers |
| `versions.ts` | Stores active clinical rule versions | Clinical Lead and Developers |
| `tests/` | Proves approved rules produce expected outcomes | QA, Developers, Clinical Lead |

---

# 24. Database Package

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `prisma/schema.prisma` | Defines PostgreSQL tables and relationships | Backend Developer |
| `prisma/migrations/` | Stores versioned schema changes | Backend Developer |
| `prisma/seed.ts` | Adds development and staging starter data | Backend Developer |
| `src/client.ts` | Creates the Prisma client | Backend Developer |
| `src/transactions/` | Provides transaction helpers | Backend Developer |
| `src/repositories/` | Contains database access implementations | Backend Developer |
| `src/audit/audit.repository.ts` | Writes audit records | Backend Developer |
| `src/audit/transactional-audit.ts` | Writes the business change and its audit record together | Backend Developer |
| `src/index.ts` | Public package exports | Backend Developer |

---

# 25. Configuration, Observability, Testing, and UI Packages

## 25.1 Config

| File | Purpose / Details | Primary owner |
|---|---|---|
| `environment.schema.ts` | Validates required environment variables | Backend and DevOps |
| `workflow-config.ts` | Defines workflow settings | Backend and Technical PM |
| `facility-config.ts` | Defines facility configuration structure | Backend Developer |
| `clinical-config.ts` | Defines approved configurable clinical values | Backend and Clinical Lead |
| `content-config.ts` | Defines content version and location settings | Frontend and Backend Developers |
| `feature-flags.ts` | Enables or disables features safely | Technical Lead |

## 25.2 Observability

| File | Purpose / Details | Primary owner |
|---|---|---|
| `logger.ts` | Writes structured technical logs | Backend and DevOps |
| `correlation-id.ts` | Links one operation across Tablet, API, Worker, and Wonder | Backend Developer |
| `redaction.ts` | Removes patient details, tokens, and secrets from logs | Backend and Security Owner |
| `error-monitoring.ts` | Reports unexpected crashes to Sentry or similar tool | DevOps and Developers |
| `metrics.ts` | Tracks failed syncs, queue size, API speed, and integration health | DevOps and Backend Developer |

Observability answers: **Is the system working, and why did it fail?**

Audit answers: **Who changed what, and when?**

## 25.3 Testing

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `fixtures/` | Reusable sample patients, assessments, facilities, psychologists, and sync records | QA and Developers |
| `builders/` | Creates valid test records programmatically | QA and Developers |
| `stubs/wonder/` | Simulates Wonder responses | Backend and QA |
| `stubs/whatsapp/` | Simulates WhatsApp responses | Backend and QA |
| `golden-cases/` | Clinically approved answers with expected scores, classifications, and routing | Clinical Lead and QA |
| `test-database/` | Creates an isolated database for tests | Backend and QA |

## 25.4 UI

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `components/` | Shared buttons, cards, dialogs, and display components | Frontend Developer |
| `forms/` | Shared form controls | Frontend Developer |
| `feedback/` | Loading, success, warning, and error components | Frontend Developer |
| `accessibility/` | Accessibility helpers | Frontend and UI/UX |
| `tokens/` | Shared typography, spacing, and design values | UI/UX and Frontend |
| `index.ts` | Public package exports | Frontend Developer |

---

# 26. Content Folder

```text
content/
├── source/
├── manifests/
└── generated/
```

## 26.1 Source Content

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `translations/en/` | English content | Content Team and Clinical Lead |
| `translations/sw/` | Kiswahili content | Translator and Clinical Lead |
| `translations/luo/` | Luo content | Translator and Clinical Lead |
| `audio/` | Approved spoken instructions and questions | Content Team |
| `avatar/` | Avatar assets, animations, and scripts | UI/UX and Frontend |
| `video/` | Psychoeducation videos | Clinical and Content Teams |
| `clinical-messages/` | Approved result and routing messages | Clinical Lead |

## 26.2 Manifests

| File | Purpose / Details | Primary owner |
|---|---|---|
| `content-manifest.json` | Master list of content files | Frontend and Content Team |
| `audio-manifest.json` | Lists audio files and language mappings | Frontend Developer |
| `video-manifest.json` | Lists approved video files | Frontend Developer |
| `screening-tools.json` | Maps tool versions to content versions | Developers and Clinical Lead |
| `content-version.json` | Identifies the active content release | Technical PM and Clinical Lead |

## 26.3 Generated Content

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `generated/validated-content/` | Content that passed automated validation | Build scripts |
| `generated/generated-manifest.json` | Manifest produced by the build process | Build scripts |

Generated content should not normally be edited manually.

---

# 27. Infrastructure Folder

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `docker/` | Container and Nginx configuration | QA/DevOps |
| `deployment/` | Development, staging, and production configuration | QA/DevOps |
| `monitoring/` | Dashboards, alerts, and Sentry setup | QA/DevOps |
| `backups/` | Backup, restore, and restore-test tooling | QA/DevOps |
| `security/` | Security policies and data-protection guidance | Security Owner and DevOps |

## 27.1 Docker

| File | Purpose / Details | Primary owner |
|---|---|---|
| `frontend.Dockerfile` | Builds frontend applications for production | QA/DevOps |
| `nginx.conf` | Serves frontend files and proxies requests where needed | QA/DevOps |
| `docker-compose.override.yml` | Local development overrides | QA/DevOps |

## 27.2 Deployment

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `development/` | Local or shared development configuration | QA/DevOps |
| `staging/` | Pre-production validation environment | QA/DevOps |
| `production/` | Live deployment configuration | QA/DevOps |

## 27.3 Monitoring

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `dashboards/` | Visual health and performance views | QA/DevOps |
| `alerts/` | Rules that notify the technical team | QA/DevOps |
| `sentry/` | Error-monitoring configuration | QA/DevOps |

## 27.4 Backups

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `backup-script/` | Creates database backups | QA/DevOps |
| `restore-script/` | Restores a backup | QA/DevOps |
| `restore-test/` | Verifies that backups can actually be restored | QA/DevOps and QA |

## 27.5 Security

| File/Folder | Purpose / Details | Primary owner |
|---|---|---|
| `README.md` | Overview of WEMA security responsibilities | Security Owner |
| `secret-management.md` | Explains storage and rotation of secrets | Security Owner and DevOps |
| `data-protection.md` | Explains protection of patient and clinical data | Security Owner and Technical PM |
| `policies/` | Approved security policies | Project Leadership |

---

# 28. Documentation Folder

```text
docs/
```

The `docs/` folder contains the written explanation of how WEMA is designed, operated, tested, and governed. These are not source-code files.

## 28.1 Documentation Overview

| Folder | What it contains | Why it matters | Primary owner |
|---|---|---|---|
| `architecture/` | System design documents | Helps everyone understand the technical structure | Architect and Technical PM |
| `workflows/` | Complete clinical and patient journeys | Keeps implementation aligned with approved processes | Technical PM and Clinical Lead |
| `integrations/` | Wonder and WhatsApp details | Prevents integration assumptions from staying undocumented | Backend Developer |
| `clinical/` | Tool, scoring, rule, and approval records | Provides clinical traceability | Clinical Lead |
| `privacy/` | Consent, retention, and access rules | Supports data protection | Data Protection Owner and Technical PM |
| `api/` | API endpoint documentation | Helps frontend and backend teams coordinate | Backend Developer |
| `database/` | Data model and migration guidance | Supports safe database changes | Backend Developer |
| `testing/` | Testing strategy and acceptance criteria | Defines how quality is verified | QA Lead |
| `deployment/` | Environment and release instructions | Supports repeatable releases | QA/DevOps |
| `security/` | Security architecture and controls | Supports safe implementation and review | Security Owner |
| `runbooks/` | Incident response instructions | Helps the team respond consistently when something fails | QA/DevOps and Technical PM |

## 28.2 Architecture Documents

| Document | Plain-language meaning | What it should contain | Primary owner |
|---|---|---|---|
| `system-context.md` | The big-picture WEMA map | Patients, psychologists, tablets, WEMA apps, Wonder, WhatsApp, and system boundaries | Architect and Technical PM |
| `component-map.md` | The list of major technical parts | Patient App, Portal, API, Worker, Database, packages, and integrations | Architect and Technical Lead |
| `data-ownership.md` | Who owns which records | Wonder ownership for EPDS-linked records and WEMA ownership for General Public | Technical PM and Backend Lead |
| `deployment-view.md` | Where each component runs | Browser/tablet, frontend server, API, Worker, PostgreSQL, and external services | QA/DevOps and Architect |
| `synchronization-design.md` | How offline data moves | IndexedDB, outbox, push, pull, retries, conflicts, and server acknowledgement | Frontend and Backend Leads |
| `decisions/` | Architecture Decision Records | Important decisions, reasons, alternatives, and consequences | Architect and Technical PM |

Example decision records:

```text
ADR-001-use-monorepo.md
ADR-002-use-indexeddb-and-dexie.md
ADR-003-separate-api-and-worker.md
ADR-004-workflow-data-ownership.md
```

## 28.3 Workflow Documents

| Document | Purpose / Details | Primary owner |
|---|---|---|
| `epds-wonder.md` | Describes the entire EPDS journey, data ownership, offline behavior, routing, and Wonder synchronization | Technical PM, Clinical Lead, Developers |
| `general-public-phq.md` | Describes registration, PHQ-2, conditional PHQ-9, routing, consultation, and scheduling | Technical PM, Clinical Lead, Developers |

Each workflow document should describe purpose, actors, entry conditions, sequence, scoring, routing, data ownership, notification behavior, offline behavior, and completion.

## 28.4 Integration Documents

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `wonder/` | Patient-list retrieval, authentication, mapping, result push, retries, error codes, and testing | Backend Developer |
| `whatsapp/` | Provider setup, approved alert types, templates, retries, and failure handling | Backend and Clinical Lead |

Suggested Wonder files:

```text
wonder-api-overview.md
wonder-patient-list.md
wonder-epds-result-push.md
wonder-error-handling.md
wonder-test-environment.md
```

Suggested WhatsApp files:

```text
whatsapp-provider.md
general-public-alert-template.md
whatsapp-retry-policy.md
```

## 28.5 Clinical Documents

| Document | Plain-language meaning | Purpose / Details | Primary owner |
|---|---|---|---|
| `assessment-tools.md` | Which screening tools WEMA uses | EPDS, PHQ-2, PHQ-9 definitions, versions, and approvals | Clinical Lead |
| `scoring-versions.md` | Which scoring formula version is active | Allows historical results to be reproduced | Clinical Lead and Developers |
| `clinical-rules.md` | What scores mean and what should happen | Continuation, classification, safety, and routing | Clinical Lead |
| `clinical-approval-register.md` | Who approved each clinical release | Approver, date, version, and change summary | Clinical Lead and Technical PM |

## 28.6 Privacy Documents

| Document | Plain-language meaning | Purpose / Details | Primary owner |
|---|---|---|---|
| `consent.md` | How consent is presented and stored | Text, language, version, withdrawal, and retention | Clinical Lead and Data Protection Owner |
| `retention-policy.md` | How long each record is kept | Patients, assessments, logs, audit records, jobs, and backups | Data Protection Owner and Technical PM |
| `data-access.md` | Who may view or change each kind of data | Patient, psychologist, developer, support, and Wonder access boundaries | Technical PM and Security Owner |

## 28.7 API Documents

Suggested files:

```text
authentication-api.md
device-api.md
patient-api.md
assessment-api.md
sync-api.md
psychologist-api.md
queue-api.md
scheduling-api.md
errors.md
```

Each API document should explain method, endpoint, authentication, request, response, validation, possible errors, and examples.

Primary owner: Backend Developer.

## 28.8 Database Documents

Suggested files:

| Document | Purpose |
|---|---|
| `data-model.md` | Explains the major entities and relationships |
| `table-reference.md` | Explains each table and important field |
| `migration-process.md` | Explains safe schema changes |
| `seed-data.md` | Explains development and staging seed data |
| `backup-and-restore.md` | Explains backup and recovery |

Primary owner: Backend Developer and QA/DevOps.

## 28.9 Testing Documents

| Suggested document | Purpose |
|---|---|
| `test-strategy.md` | Defines unit, integration, contract, E2E, clinical, and offline testing |
| `acceptance-criteria.md` | Defines when a feature is accepted |
| `clinical-validation.md` | Defines scoring and routing approval |
| `offline-test-cases.md` | Covers loss of internet, retries, duplicate sync, and recovery |
| `integration-test-plan.md` | Covers Wonder and WhatsApp testing |
| `release-test-checklist.md` | Final QA checklist before release |

Primary owner: QA Lead, with Developers and Clinical Lead.

## 28.10 Deployment Documents

| Suggested document | Purpose |
|---|---|
| `local-development.md` | How developers run WEMA locally |
| `staging-deployment.md` | How staging is deployed and verified |
| `production-deployment.md` | How production is deployed |
| `environment-variables.md` | Meaning of required environment variables |
| `release-process.md` | Versioning and approval process |
| `rollback-process.md` | How to reverse a failed release |

Primary owner: QA/DevOps.

## 28.11 Security Documents

| Suggested document | Purpose |
|---|---|
| `security-architecture.md` | Overall security design |
| `authentication.md` | User authentication and authorization |
| `device-security.md` | Tablet registration, credentials, revocation, and replacement |
| `logging-and-redaction.md` | What may and may not appear in logs |
| `dependency-management.md` | How vulnerable dependencies are handled |
| `incident-response.md` | How security incidents are managed |

Primary owner: Security Owner and QA/DevOps.

## 28.12 Runbooks

A runbook is a step-by-step response guide used when something goes wrong.

| Document | When it is used | Primary owner |
|---|---|---|
| `sync-failure.md` | Tablet records are not reaching the server | Frontend, Backend, DevOps |
| `wonder-outage.md` | Wonder is unavailable or rejecting requests | Backend and Technical PM |
| `whatsapp-failure.md` | General Public alerts are not being delivered | Backend and Clinical Operations |
| `tablet-replacement.md` | A tablet is lost, damaged, revoked, or replaced | IT Support and Backend |
| `database-restore.md` | PostgreSQL data must be recovered | QA/DevOps |
| `rollback.md` | A release must be reverted | QA/DevOps and Technical Lead |

Every runbook should contain symptoms, checks, immediate action, recovery steps, escalation, verification, and incident-record instructions.

---

# 29. Scripts Folder

| Folder | Purpose / Details | Primary owner |
|---|---|---|
| `setup/` | Installation and environment verification | Developers |
| `database/` | Migration, seed, and local reset commands | Backend Developer |
| `content/` | Content validation and manifest generation | Frontend and Content Team |
| `testing/` | Contract and clinical golden-case execution | QA |
| `maintenance/` | Controlled operational utilities | QA/DevOps |

| File | Purpose / Details |
|---|---|
| `setup/install.ts` | Prepares project dependencies |
| `setup/verify-environment.ts` | Checks required tools and variables |
| `database/migrate.ts` | Applies database migrations |
| `database/seed.ts` | Adds development data |
| `database/reset-local.ts` | Rebuilds a local development database |
| `content/validate-content.ts` | Checks content structure and references |
| `content/build-manifest.ts` | Creates content manifests |
| `content/verify-translations.ts` | Finds missing translation keys |
| `testing/run-contract-tests.ts` | Runs API and sync contract tests |
| `testing/run-golden-cases.ts` | Runs clinically approved answer cases |
| `maintenance/rotate-device-credential.ts` | Replaces a device credential |
| `maintenance/verify-backup.ts` | Confirms backup usability |

---

# 30. GitHub Folder

| Folder/File | Purpose / Details | Primary owner |
|---|---|---|
| `workflows/pull-request.yml` | Runs linting, type checks, tests, and builds on pull requests | QA/DevOps |
| `workflows/clinical-rules-check.yml` | Runs clinical tests when scoring, rules, or content changes | QA and Clinical Lead |
| `workflows/deploy-staging.yml` | Deploys approved code to staging | QA/DevOps |
| `workflows/deploy-production.yml` | Deploys approved production releases | QA/DevOps |
| `ISSUE_TEMPLATE/` | Standard issue forms for bugs, features, and tasks | Technical PM |
| `CODEOWNERS` | Defines mandatory reviewers for important folders | Technical Lead and Technical PM |
| `PULL_REQUEST_TEMPLATE.md` | Requires summary, tests, risks, and screenshots | Technical PM and Technical Lead |

---

# 31. Ownership Summary

| Area | Primary owner | Supporting owners |
|---|---|---|
| Patient App | Frontend Developer | QA, UI/UX, Backend |
| Psychologist Portal | Frontend Developer | QA, UI/UX, Backend |
| Backend API | Backend Developer | QA, DevOps |
| Worker | Backend Developer | QA, DevOps |
| Local-first infrastructure | Frontend and Backend Developers | QA |
| Clinical tools and rules | Clinical Lead and Developers | QA |
| Wonder integration | Backend Developer | Technical PM, QA |
| WhatsApp integration | Backend Developer | Clinical Lead, QA |
| Content and translations | Content Team and Clinical Lead | Frontend Developer |
| Database | Backend Developer | QA/DevOps |
| Deployment and backups | QA/DevOps | Technical Lead |
| Documentation | Technical PM | All functional owners |
| Security | Security Owner or Technical Lead | DevOps and Developers |

---

# 32. Final Mental Model

```text
apps/
    Things that run

packages/
    Code shared by things that run

content/
    Words, audio, video, and clinical messages

infrastructure/
    How WEMA is deployed, monitored, secured, and backed up

docs/
    Written explanation of how WEMA works

scripts/
    Repeatable commands

.github/
    GitHub automation and team rules
```

The main WEMA flow is:

```text
Patient
→ Patient App
→ Local IndexedDB
→ Outbox
→ Synchronization
→ WEMA API
→ PostgreSQL
→ Worker
→ Wonder or WhatsApp

Psychologist
→ Psychologist Portal
→ WEMA API
→ Availability, rooms, queue, assignments, consultation, and scheduling
```

The repository tree is an architectural guide. It does not mean that every empty folder must be created on the first day. Folders and files should be added when their implementation phase begins, while the agreed ownership boundaries remain unchanged.
