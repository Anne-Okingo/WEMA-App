# WEMA

WEMA is an offline-first digital mental health screening and care-routing platform for healthcare facilities in Kisumu County, Kenya. It is designed to help patients complete clinically approved mental health screenings, receive an immediate result, and be routed to the appropriate care even when internet connectivity is unreliable.

WEMA MVP1 supports two distinct workflows on one shared platform:

- **Maternal mental health:** Edinburgh Postnatal Depression Scale (EPDS), integrated with Wonder HMIS.
- **General public mental health:** PHQ-2 with PHQ-9 continuation when clinically indicated, managed within WEMA.

> **Project status:** Phase 1 — Repository, Development Environment, and Engineering Standards. The repository is currently establishing its monorepo structure, application foundations, shared tooling, development environment, and contribution standards. Commands and paths marked as planned may not work until their Phase 1 issue is complete.

---

## Table of contents

- [Why WEMA exists](#why-wema-exists)
- [MVP1 scope](#mvp1-scope)
- [How the workflows differ](#how-the-workflows-differ)
- [Core design principles](#core-design-principles)
- [System overview](#system-overview)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Current development phase](#current-development-phase)
- [Getting started](#getting-started)
- [Configuration and secrets](#configuration-and-secrets)
- [Engineering workflow](#engineering-workflow)
- [Testing and quality](#testing-and-quality)
- [Clinical safety, privacy, and security](#clinical-safety-privacy-and-security)
- [Documentation](#documentation)
- [Keeping this README current](#keeping-this-readme-current)
- [Glossary](#glossary)

---

## Why WEMA exists

Healthcare facilities need a reliable way to identify mental health risks early and connect patients to appropriate support. Connectivity cannot be assumed, and a screening must not be lost or interrupted simply because an external system is temporarily unavailable.

WEMA addresses this by:

- allowing screening to continue offline after the application and required content are available locally;
- saving patient interactions locally before attempting synchronization;
- applying approved scoring and routing rules consistently;
- supporting psychologist availability, room assignment, and waiting queues;
- synchronizing with backend services when connectivity returns;
- isolating Wonder HMIS integration behind a dedicated adapter;
- keeping the ownership of each clinical record explicit; and
- recording important actions and integration outcomes for auditability.

WEMA is a screening and workflow-support platform. It does not replace clinical judgement, emergency procedures, or the responsibilities of the relevant healthcare professionals.

## MVP1 scope

### Included

MVP1 delivers the common platform capabilities required by both workflows:

- patient-facing screening application;
- psychologist operations portal;
- English, Kiswahili, and Luo content support;
- text and audio-assisted questionnaire delivery;
- local-first storage and offline operation;
- EPDS, PHQ-2, and PHQ-9 assessment flows;
- versioned scoring, classification, and routing rules;
- psychologist shift and availability management;
- room assignment and status;
- patient queue and assignment management;
- consultation workflow and outcomes;
- psychoeducation content;
- synchronization with duplicate prevention and visible retry handling;
- Wonder patient-list retrieval and EPDS result submission;
- General Public high-risk WhatsApp alerts;
- authentication, authorization, audit logging, and health monitoring; and
- automated unit, integration, contract, clinical-rule, and end-to-end tests.

### Explicitly out of scope for MVP1

- Admin Portal;
- advanced analytics and operational dashboards;
- long-term EPDS reporting inside WEMA;
- CHP task creation or assignment;
- WEMA-managed EPDS SMS alerts;
- WEMA-managed EPDS home visits or community follow-up;
- sending General Public screening data to Wonder;
- additional assessment tools unless formally approved through change control; and
- unnecessary infrastructure or framework complexity that does not support MVP1.

## How the workflows differ

| Concern | EPDS–Wonder workflow | General Public PHQ workflow |
|---|---|---|
| Intended population | Pregnant and postpartum patients | General public patients |
| Patient identity | Sourced from Wonder where available | Registered directly in WEMA |
| Assessment | EPDS | PHQ-2, followed by PHQ-9 when continuation rules are met |
| Offline screening | Supported | Supported |
| Local scoring and routing | WEMA | WEMA |
| Permanent clinical record | Wonder HMIS | WEMA |
| Result integration | WEMA sends the completed EPDS result and outcome to Wonder | No General Public result is sent to Wonder |
| High-risk alert owner | Wonder | WEMA |
| Community follow-up owner | Wonder | WEMA only where approved and applicable |

These boundaries are safety-critical. Shared code must not blur patient source, record ownership, integration target, or alert ownership between the two workflows.

## Core design principles

| Principle | What it means in practice |
|---|---|
| Offline-first | Core screening continues without connectivity after required application resources are available. |
| Local-first writes | Patient interactions are committed to the device before network synchronization is attempted. |
| Workflow separation | EPDS–Wonder and General Public PHQ share platform capabilities but retain different ownership and integration rules. |
| Clinical traceability | Assessment, content, scoring, consent, and rule versions are stored and auditable. |
| No silent failure | Failed synchronization, notifications, and Wonder submissions are visible and retryable. |
| Idempotent synchronization | Repeated delivery must not create duplicate clinical or operational records. |
| Minimum necessary scope | Build the smallest safe solution that satisfies approved MVP1 requirements. |
| Privacy by design | Sensitive patient information is minimized, protected, and redacted from logs and monitoring payloads. |
| Safety before speed | Clinical rules and high-risk handling require formal validation before release. |

## System overview

```text
Patient App                         Psychologist Portal
(React + Vite)                      (React + Vite)
      |                                    |
      | local-first screening              | clinical operations
      v                                    v
IndexedDB + local outbox  ----sync---->  WEMA REST API
                                              |
                         +--------------------+--------------------+
                         |                    |                    |
                         v                    v                    v
                    PostgreSQL        Background Worker     Audit/Logging
                                              |
                                     +--------+--------+
                                     |                 |
                                     v                 v
                                Wonder HMIS      WhatsApp provider
                                (EPDS only)      (General Public only)
```

### Main components

- **Patient App:** Delivers the EPDS and General Public PHQ screening experiences and persists screening work locally.
- **Psychologist Portal:** Supports authentication, shifts, availability, rooms, queues, assignments, and consultations.
- **Backend API:** Provides versioned REST endpoints, access control, workflow enforcement, synchronization, and operational services.
- **Background Worker:** Processes Wonder refreshes and submissions, General Public alerts, retries, and audit-related jobs independently from the API.
- **PostgreSQL:** Stores WEMA-owned clinical records and the operational, synchronization, integration, and audit data required by both workflows.
- **Wonder Adapter:** Keeps Wonder authentication, mapping, error handling, and API changes isolated from WEMA's internal domain.
- **Local Outbox:** Retains pending device operations with idempotency and retry metadata until they are synchronized successfully.

## Technology stack

The approved MVP1 direction is:

| Area | Technology |
|---|---|
| Patient App and Psychologist Portal | React, Vite, TypeScript |
| Offline storage | IndexedDB with Dexie.js |
| Offline application resources | Workbox service worker |
| Backend API | Node.js, Express, TypeScript |
| Validation and shared contracts | Zod |
| Database | PostgreSQL |
| Database access and migrations | Prisma ORM |
| Background processing | Dedicated worker using a PostgreSQL-backed queue such as pg-boss |
| Backend logging | Pino structured logs with sensitive-field redaction |
| Frontend tests | Vitest, React Testing Library, Playwright |
| Backend tests | Vitest or Jest, with Supertest |
| Local backend orchestration | Docker Compose |
| CI/CD | GitHub Actions or equivalent |

Technology changes that affect contracts, data ownership, clinical safety, synchronization, security, or deployment must be documented and reviewed before implementation.

## Repository structure

WEMA is being developed as a single npm-workspaces monorepo. The planned top-level structure is:

```text
wema/
├── apps/
│   ├── frontend/
│   │   ├── patient-app/
│   │   └── psychologist-portal/
│   └── backend/
│       ├── api/
│       └── worker/
├── packages/
│   ├── application/
│   ├── assessment-tools/
│   ├── clinical-rules/
│   ├── contracts/
│   ├── database/
│   ├── domain/
│   ├── observability/
│   ├── scoring/
│   └── security/
├── infrastructure/
├── content/
├── docs/
├── scripts/
└── .github/
```

The complete proposed tree and the responsibility of each area are documented in [WEMA Repository Structure](docs/architecture/WEMA_Repository_Structure.md). During Phase 1, some planned directories may not exist yet.

## Current development phase

### Phase 1 — Repository, Development Environment, and Engineering Standards

The current objective is to make the repository consistent and usable by the whole engineering team before feature development begins.

Phase 1 includes:

- approved monorepo scaffolding and npm workspaces;
- skeleton Patient App, Psychologist Portal, API, and Worker projects;
- shared TypeScript, linting, formatting, and test configuration;
- validated environment-variable handling and `.env.example`;
- lightweight Docker Compose for PostgreSQL, API, and Worker;
- automated pull-request checks;
- GitHub ownership, issue, and pull-request standards; and
- onboarding and developer documentation.

Phase 1 is complete when a new developer can clone the repository, configure the environment, start the required services, run the checks, and contribute through the agreed pull-request process.

See the [Detailed Sequential Implementation Plan](docs/architecture/WEMA_MVP1_Detailed_Sequential_Implementation_Plan.md) for later phases and delivery gates.

## Getting started

### Prerequisites

- Node.js 20+
- npm 9+

Frontend applications run directly on the developer machine during active development for fast hot-module replacement.

### Setup

```bash
git clone <repository-url>
cd WEMA-App
npm install
```

### Running the apps

```bash
npm run dev --workspace=@wema/patient-app
npm run dev --workspace=@wema/psychologist-portal
```

### Verification

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

## Configuration and secrets

- Copy `.env.example` to `.env` for local development once the example file is available.
- Never commit `.env`, credentials, tokens, patient data, production exports, or private keys.
- Use separate databases, credentials, Wonder endpoints, and notification destinations for development, staging, and production.
- Use sandbox or controlled test destinations outside production.
- Validate configuration at application startup and fail with a clear error when required values are invalid.
- Do not print secrets, patient identifiers, assessment answers, or authorization headers in logs.

The committed `.env.example` must contain descriptions or safe placeholders only. Real secrets must be supplied through an approved secrets mechanism.

## Engineering workflow

WEMA uses a simplified GitFlow model:

- `main` contains approved production releases;
- `develop` contains work for the next release;
- normal work starts from `develop` on a short-lived `feature/*`, `fix/*`, `chore/*`, or `docs/*` branch;
- all changes enter protected branches through a reviewed pull request; and
- clinical, architecture, database, integration, infrastructure, and security changes require the relevant specialist review.

Every implementation should begin with a sufficiently defined issue containing scope, acceptance criteria, dependencies, test requirements, and a Definition of Done.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before creating a branch or pull request. It is the source of truth for branch naming, commits, reviews, testing expectations, releases, and change control.

## Testing and quality

Testing is part of implementation, not a final cleanup activity.

| Change | Expected evidence |
|---|---|
| Every pull request | Formatting, lint, type checking, unit tests, and build |
| Clinical definitions or rules | Approved golden cases, threshold boundaries, and rule-version checks |
| API or shared contract | Schema validation and contract tests |
| Database schema | Migration validation and repository/integration tests |
| Synchronization | Offline, retry, conflict, idempotency, and recovery tests |
| Integration adapter | Mapping, timeout, failure normalization, and retry tests against approved test contracts |
| Release | Integration, end-to-end, offline/recovery, security, and smoke tests |

A failed network call must not silently discard screening data. A retry must not create duplicates. Tests must specifically protect these guarantees.

## Clinical safety, privacy, and security

WEMA handles sensitive health information. Contributors must apply the following rules throughout design, development, testing, and operations:

- never use identifiable real patient data in local development, screenshots, demos, fixtures, or automated tests;
- collect and expose only the data required for the approved workflow;
- enforce facility, role, workflow, and device boundaries;
- keep clinical scoring and routing rules versioned, deterministic, reviewed, and covered by approved tests;
- preserve audit history for consent, assessment completion, risk classification, routing, consultation, synchronization, authentication, and integration events;
- redact sensitive fields from logs, error monitoring, and job payload output;
- do not send EPDS alerts through the General Public WhatsApp path;
- do not send General Public screening records to Wonder;
- do not bypass required clinical review for a scoring, threshold, routing, or safety-rule change; and
- report suspected data exposure, incorrect clinical behavior, or lost screening data immediately through the approved incident process.

## Documentation

The principal project documents are:

| Document | Purpose |
|---|---|
| [WEMA Repository Structure](docs/architecture/WEMA_Repository_Structure.md) | Authoritative MVP1 technical roadmap, architecture, technology choices, and proposed monorepo structure. |
| [Detailed Sequential Implementation Plan](docs/architecture/WEMA_MVP1_Detailed_Sequential_Implementation_Plan.md) | Phase-by-phase delivery plan, dependencies, deliverables, tests, acceptance criteria, and gates. |
| [Repository Structure Explanation](docs/architecture/WEMA_Repository_Structure_Explaination.md) | Additional explanation of the proposed structure and architectural boundaries. |
| [Unified Workflow Documentation v3](docs/architecture/WEMA_Unified_Workflow_Documentation_v3_.md) | Earlier workflow reference; where its MVP phase labels conflict with the newer MVP1 roadmap, confirm the current approved scope before implementation. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Git workflow, branch and commit conventions, pull requests, reviews, testing, and Definition of Done. |

Architecture decisions that change approved scope, clinical rules, data ownership, synchronization, integrations, or security should be recorded as an Architecture Decision Record or approved decision-log issue. Chat messages and meeting notes are not sufficient as the permanent decision record.

## Keeping this README current

This README is a living document and should describe the repository as it exists, while clearly labelling planned work.

Update it in the same pull request whenever a change affects:

- project scope or current phase;
- setup prerequisites or commands;
- environment variables;
- application or package locations;
- architecture or technology choices;
- supported workflows or external integrations;
- testing and quality commands;
- deployment or operational procedures; or
- links to authoritative documentation.

When updating this file:

1. Replace planned instructions with verified commands as soon as they work.
2. Do not describe an unmerged feature as available.
3. Link detailed design documents instead of copying large specifications here.
4. Record significant decisions in the appropriate architecture document or decision record.
5. Include documentation review in the issue and pull-request Definition of Done.

**README owner:** Technical Project Manager, with technical accuracy reviewed by the relevant engineering owner and clinical accuracy reviewed by the Clinical Lead where applicable.

## Glossary

| Term | Meaning |
|---|---|
| CHP | Community Health Promoter. CHP workflows are owned by Wonder and are outside WEMA MVP1. |
| EPDS | Edinburgh Postnatal Depression Scale, used for the maternal mental health workflow. |
| HMIS | Health Management Information System. |
| Local-first | Data is saved locally before network synchronization is attempted. |
| MVP1 | The first approved minimum viable product described by the current technical roadmap. |
| PHQ-2 | Two-question initial depression screening tool. |
| PHQ-9 | Nine-question depression screening tool used when approved continuation rules are met. |
| Wonder | The external HMIS used for maternal patient identity, permanent EPDS records, alerts, and downstream follow-up. |

---

WEMA is being built collaboratively by engineering, clinical, design, QA, DevOps, Wonder, and facility stakeholders. Safe delivery depends on keeping technical implementation, clinical rules, data ownership, and operational responsibilities aligned as the project evolves.
