# WEMA MVP1 — Technical Implementation Roadmap
### EPDS & PHQ2/PHQ9 Workflow, Wonder HMIS Integration
**Kisumu County — Mental Health Screening System for Maternal and General Public**

---

## Document Control

| Field | Value |
|---|---|
| Document title | WEMA MVP1 Technical Implementation Roadmap |
| Scope | MVP1 — EPDS and PHQ-2/PHQ-9 Screening Workflows, Wonder-Integrated, Psychologist Portal |
| Status | Implementation-ready draft for engineering and  clinical review |
| Superseded architecture | CHP home-visit escalation (Wonder now owns all community follow-up) |
| Primary source documents | *WEMA Unified Workflow Documentation v3*, *WEMA Architecture Updates — No CHP MVP* |

> **Scope note:** This roadmap governs **MVP1 only** and includes two workflows: the EPDS workflow integrated with Wonder HMIS and the General Public PHQ-2/PHQ-9 workflow managed within WEMA. CHP task generation, SMS dispatch, and home-visit workflows are **explicitly out of scope** for MVP1 and are called out as a *future optional enhancement* only, per the architecture update that reassigns all community follow-up responsibility to Wonder HMIS.

---

## 1. Executive Summary

Executive Summary

WEMA MVP1 is an offline-first, local-first digital mental health screening platform designed to support early identification, triage, and management of mental health conditions within healthcare facilities. The platform delivers two independent clinical screening workflows within a single application:

Maternal Mental Health Workflow using the Edinburgh Postnatal Depression Scale (EPDS), fully integrated with Wonder HMIS.
General Public Mental Health Workflow using PHQ-2 with automatic escalation to PHQ-9 when clinically indicated, managed entirely within WEMA.

Both workflows operate on the same technology platform, sharing a common offline-first architecture, multilingual patient interface, psychologist operations portal, routing engine, room management, scheduling, synchronization framework, and local data storage. Clinical screening continues uninterrupted without internet connectivity, allowing patient registration, questionnaire completion, local scoring, risk classification, room assignment, queue management, and routing decisions to occur entirely on the device. Network connectivity is only required for background synchronization and external integrations.

Although the workflows share the same platform, they have different clinical ownership models.

For the EPDS workflow, Wonder HMIS remains the system of record. WEMA retrieves the facility patient list from Wonder, performs the complete screening workflow locally, including patient identification, EPDS assessment, automated scoring, risk classification, patient routing, psychologist availability checks, room assignment, waiting queue management, and presentation of the screening outcome. These clinical decisions are performed entirely within WEMA and continue to function even when the facility is offline. Once the assessment is completed, WEMA stores the assessment locally, synchronizes it with the WEMA backend, and submits the completed EPDS assessment and clinical outcome to Wonder through the Wonder Integration Adapter. After successful synchronization, Wonder becomes responsible for maintaining the patient's permanent clinical record, generating high-risk alerts, and managing all subsequent clinical follow-up and community-level interventions according to the hospital's established workflows.

For the General Public workflow, WEMA acts as the system of record. Patients are registered directly within WEMA, PHQ-2 and PHQ-9 assessments are completed locally, results are stored within the WEMA database, and high-risk patients are routed through WEMA's operational services. WEMA manages psychologist availability, room assignment, waiting queues, and WhatsApp alert notifications for this workflow. Appointment scheduling and reporting dashboards are deferred to MVP2. No General Public screening data is transmitted to Wonder HMIS.

The platform follows a local-first architecture, ensuring every patient interaction is committed to the device before any network communication occurs. Synchronization is performed asynchronously using an outbox pattern, ensuring resilience against unstable connectivity while preventing data loss or duplicate submissions. Integration with Wonder is isolated through a dedicated adapter layer, allowing WEMA's internal architecture to remain independent of Wonder's implementation details.

This document serves as the authoritative technical implementation reference for the WEMA MVP1 platform. It defines the system architecture, implementation strategy, project structure, integration patterns, offline-first design, workflow orchestration, synchronization model, deployment architecture, testing strategy, and engineering standards required by software engineers, UI/UX designers, clinical stakeholders, quality assurance teams, DevOps engineers, and project managers to successfully deliver, validate, and deploy the WEMA MVP1 platform.
---

## 2. Architecture Overview

### 2.1 System Responsibility Split

| Responsibility                          | EPDS Workflow (Maternal Mental Health) | General Public Workflow                                    |
| --------------------------------------- | -------------------------------------- | ---------------------------------------------------------- |
| Patient registration / identification   | Wonder patient list (via WEMA)         | WEMA                                                       |
| Patient self-screening                  | WEMA                                   | WEMA                                                       |
| Offline questionnaire delivery          | WEMA                                   | WEMA                                                       |
| Local scoring & risk classification     | WEMA                                   | WEMA                                                       |
| Psychologist availability               | WEMA                                   | WEMA                                                       |
| Room assignment                         | WEMA                                   | WEMA                                                       |
| Patient routing                         | WEMA                                   | WEMA                                                       |
| Waiting queue management                | WEMA                                   | WEMA                                                       |
| Appointment scheduling                  | Not applicable (MVP2)                  | Not applicable (MVP2)                                                       |
| Psychoeducation content delivery        | WEMA                                   | WEMA                                                       |
| Local storage & offline synchronization | WEMA                                   | WEMA                                                       |
| Push assessment results                 | WEMA → WEMA Backend → Wonder HMIS      | WEMA                                            |
| Primary clinical record                 | Wonder HMIS                            | WEMA                                                       |
| Clinical reporting & analytics                   | Wonder HMIS         | WEMA (MVP2)                                                       |
| High-risk alert generation              | Wonder HMIS                            | WEMA                                                       |
| Community follow-up                     | Wonder HMIS                            | WEMA (where applicable within the General Public workflow MVP2) |
| Long-term patient management            | Wonder HMIS                            | WEMA                                                       |

## 2.1.1 Shared Responsibilities

| Responsibility                      | Owner |
| ----------------------------------- | ----- |
| Patient self-screening              | WEMA  |
| Offline questionnaire delivery      | WEMA  |
| Local scoring & risk classification | WEMA  |
| Psychologist availability           | WEMA  |
| Room assignment                     | WEMA  |
| Patient routing                     | WEMA  |
| Waiting queue management            | WEMA  |
| Psychoeducation content delivery    | WEMA  |
| Local storage & synchronization     | WEMA  |
| Multilingual interface              | WEMA  |
| Offline-first operation             | WEMA  |


### 2.2 High-Level Component Map

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            WEMA ACCESS LAYER                                 │
│                                                                              │
│  /screening/epds        /screening/public         /psychologist             │
│  EPDS workflow          General Public workflow   Clinical operations portal │
└───────────────┬──────────────────────┬───────────────────────┬───────────────┘
                │                      │                       │
                ▼                      ▼                       ▼
┌──────────────────────────────────────────────┐   ┌────────────────────────────┐
│        WEMA PATIENT TABLET APP               │   │  PSYCHOLOGIST PORTAL       │
│              React + Vite                    │   │       React + Vite         │
│                                              │   │                            │
│ Shared capabilities                          │   │ Authentication             │
│ • Language selection                         │   │ • JWT-based login          │
│                                              │   │ • Role and facility context│
│ • Text, audio support                        │   │                            │
│ • Questionnaire presentation                 │   │ Clinical operations        │
│ • Local scoring                              │   │ • Start/end shift          │
│ • Local risk classification                  │   │ • Availability status      │
│ • Local routing decision                     │   │ • Room selection/status    │
│ • Psychologist and room lookup               │   │ • Live patient queue       │
│ • Waiting queue                              │   │ • Assigned patients        │
│ • Psychoeducation content                    │   │ • Start consultation       │
│ • Session reset                              │   │ • Complete consultation    │
│                                              │   │                            │
│ Workflow entry routes                        │   │                            │
│                                              │   │ Not included in MVP1       │
│ /screening/epds                              │   │ • EPDS dashboard           │
│ • Wonder patient identification              │   │ • EPDS reports             │
│ • EPDS assessment                            │   │ • Analytics dashboard      │
│ • Result destined for Wonder                 │   │                            │
│                                              │   │ Dashboard and reporting    │
│ /screening/public                            │   │ are deferred to MVP2.      │
│ • WEMA patient registration                  │   └──────────────┬─────────────┘
│ • PHQ-2                                      │                  │
│ • PHQ-9 when triggered                       │                  │ HTTPS + JWT
│ • Result stored in WEMA                      │                  │
└──────────────────────┬───────────────────────┘                  │
                       │                                          │
                       ▼                                          │
┌──────────────────────────────────────────────┐                  │
│           LOCAL-FIRST DEVICE LAYER           │                  │
│                                              │                  │
│ IndexedDB using Dexie.js                     │                  │
│ • Cached Wonder patient list                 │                  │
│ • WEMA public patients                       │                  │
│ • Screening sessions                        │                  │
│ • Assessment answers                        │                  │
│ • Scores and risk classifications           │                  │
│ • Routing decisions                         │                  │
│ • Cached psychologist availability          │                  │
│ • Cached room status                        │                  │
│ • Queue entries                             │                  │
│ • Pending synchronization records           │                  │
│ • Audit events                              │                  │
│                                             │                  │
│ Service Worker using Workbox                │                  │
│ • Application-shell cache                   │                  │
│ • Translation cache                         │                  │
│ • Audio and video cache                     │                  │
│ • Offline application startup               │                  │
│                                              │                  │
│ Local outbox                                 │                  │
│ • Durable pending operations                │                  │
│ • Idempotency keys                          │                  │
│ • Retry metadata                            │                  │
└──────────────────────┬───────────────────────┘                  │
                       │                                          │
                       │ HTTPS synchronization when online         │
                       └──────────────────────┬───────────────────┘
                                              ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     WEMA BACKEND PLATFORM                                   │
│                       Node.js + Express                                     │
│                                                                              │
│ API and access control                                                       │
│ • REST API                                                                  │
│ • Authentication and authorization                                          │
│ • Idempotency enforcement                                                   │
│                                                                              │
│ Workflow orchestration                                                       │
│ • EPDS_WONDER workflow                                                       │
│ • GENERAL_PUBLIC_PHQ workflow                                               │
│ • Patient-source validation                                                  │
│ • Assessment-tool validation                                                 │
│ • Integration-target validation                                              │
│ • Alert-owner validation                                                     │
│                                                                              │
│ Shared clinical operations                                                   │
│ • Psychologist service                                                       │
│ • Availability service                                                       │
│ • Room service                                                               │
│ • Routing service                                                            │
│ • Assignment service                                                         │
│ • Queue service                                                              │
│ • Consultation service                                                       │
│                                                                              │
│ Offline synchronization                                                      │
│ • Sync push and pull                                                         │
│ • Conflict handling                                                          │
│ • Duplicate prevention                                                       │
│ • Failed-sync visibility                                                     │
│                                                                              │
│ Integration and background processing                                        │
│ • Wonder integration adapter                                                 │
│ • Wonder patient-list refresh worker                                         │
│ • EPDS result push worker                                                    │
│ • General Public WhatsApp alert worker                                       │
│ • Retry worker                                                               │
│ • Audit and logging service                                                  │
└───────────────┬───────────────────────────────┬──────────────────────────────┘
                │                               │
                │                               │
                ▼                               ▼
┌──────────────────────────────────┐   ┌───────────────────────────────────────┐
│        WEMA POSTGRESQL           │   │            WONDER HMIS API            │
│                                  │   │                                       │
│ Primary record for:              │   │ Master record for:                    │
│ • General Public patients        │   │ • Maternal patient identity           │
│ • PHQ-2 assessments              │   │                                       │
│ • PHQ-9 assessments              │   │ • Permanent EPDS clinical record      │
│ • General Public appointments    │   │                                       │
│ • General Public notifications   │   │ Receives from WEMA:                   │
│                                  │   │ • EPDS responses                      │
│ Operational data for both:       │   │ • EPDS score                          │
│ • Screening sessions             │   │ • Risk classification                 │
│ • Routing decisions              │   │ • Clinical routing outcome            │
│ • Psychologist availability      │   │ • Assessment completion status        │
│ • Rooms                          │   │                                       │
│ • Queue entries                  │   │ Wonder owns:                          │
│ • Assignments                    │   │ • EPDS high-risk alert dispatch       │
│ • Consultations                  │   │ • SMS and CHP workflows               │
│ • Sync state                     │   │ • Home-visit workflow                 │
│ • Integration events             │   │ • Community-level follow-up           │
│ • Audit logs                     │   │ • Long-term EPDS reporting            │
│                                  │   │                                       │
│ WEMA is not the permanent EPDS   │   │ Wonder exposes:                       │
│ clinical system of record.       │   │ • Today's patient list                │
└──────────────────────────────────┘   │ • EPDS result-receiving endpoint      │
                                       └───────────────────────────────────────┘


                    GENERAL PUBLIC ALERT PATH

┌─────────────────────────────┐
│ WEMA Notification Worker    │
│                             │
│ • General Public only       │
│ • High-risk policy check    │
│ • Retry on provider failure │
│ • Audit alert status        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Facility WhatsApp Group     │
│                             │
│ Receives high risk yello/red
  alerts for the               │
│ General Public workflow.    │
└─────────────────────────────┘
```

### 2.3 Updated End-of-Day Flow (No CHP)

```
Patient not reviewed before business closes
        ↓
Assessment stored locally (IndexedDB)
        ↓
Assessment synchronized to WEMA Backend (SYNC_ASSESSMENT)
        ↓
WEMA Backend pushes assessment + clinical outcome to Wonder (UPDATE_WONDER)
        ↓
Wonder HMIS initiates community follow-up (out of WEMA's scope)
```

### 2.4 Local Jobs (Tablet Upload)

```
LOCAL OUTBOX JOBS
├── SYNC_WEMA_PATIENT
├── SYNC_SCREENING_SESSION
├── SYNC_ASSESSMENT
├── SYNC_ROUTING_DECISION
├── SYNC_QUEUE_ENTRY
├── SYNC_ASSIGNMENT
└── SYNC_AUDIT_EVENT


LOCAL BACKGROUND PULL TASKS/DOWNLOADS
├── REFRESH_WONDER_PATIENT_CACHE
├── REFRESH_RESOURCE_SNAPSHOT
└── REFRESH_CONTENT_MANIFEST
```

### 2.5 Backend Jobs

```
REFRESH_WONDER_PATIENTS
PUSH_EPDS_TO_WONDER
SEND_GENERAL_PUBLIC_WHATSAPP_ALERT
RETRY_FAILED_SYNCHRONIZATION
WRITE_AUDIT_LOG

```

| Job | Purpose |
|---|---|
| **REFRESH_WONDER_PATIENTS** | Periodically retrieves the latest patient list from Wonder HMIS for facilities using the EPDS workflow and makes it available for offline synchronization to patient tablets. |
| **PUSH_EPDS_TO_WONDER** | Pushes completed EPDS assessments, scores, risk classifications, and routing outcomes from WEMA to Wonder HMIS. Includes retry handling for temporary integration failures. |
| **SEND_GENERAL_PUBLIC_WHATSAPP_ALERT** | Sends high-risk alerts to the configured Mental Health WhatsApp group for patients screened through the General Public workflow only. This job is never executed for EPDS assessments. |
| **RETRY_FAILED_SYNCHRONIZATION** | Automatically retries failed synchronization jobs, including Wonder integrations and other pending backend operations, ensuring reliable delivery after temporary network or service failures. |
| **WRITE_AUDIT_LOG** | Persists clinically significant system events, integration activities, authentication events, synchronization outcomes, and operational actions for compliance and troubleshooting. |

---


### 2.6 Full EPDS Data Flow (Step-by-Step)

1. Application starts on the facility tablet.
2. Language is selected (English / Kiswahili / Luo).
3. Patient list is retrieved from the locally synced Wonder queue (IndexedDB, populated by a prior backend sync).
4. Patient is identified in the list, or registered via the fallback flow if absent — **fallback registration never blocks screening**.
5. EPDS (10 questions, presented as Q1–5 then Q6–10) is completed.
6. Answers are saved locally as they're entered.
7. Scoring is performed entirely in-browser, no network call.
8. Risk is classified locally (Green / Yellow / Red).
9. Result and clinical interpretation are displayed to the patient.
10. The assessment is added to the local outbox.
11. When connectivity is available, the result is synchronized to the WEMA backend.
12. The backend pushes the result and outcome to Wonder.
13. High-risk (Red, and deprioritized Yellow) patients are routed into the psychologist workflow — this routing decision itself is made **locally**, without waiting on the backend.
14. Psychologist availability and room status are checked against the locally cached resource state.
15. The patient is allocated a room or placed in the local wait queue (Red ahead of Yellow).
16. The psychologist starts and completes the session via the Psychologist Portal; session outcome is logged.

### 2.6.1 Full PHQ-2 / PHQ-9 Data Flow (Step-by-Step)

1. The application starts on the facility tablet.
2. The user selects a language (English / Kiswahili / Luo).
3. The patient is informed about the purpose of the screening and provides informed consent.
4. Since this workflow is not integrated with Wonder HMIS, the patient is registered directly in WEMA by entering the required demographic information (e.g., full name, phone number, national ID/passport number, age, and residence).
5. A new screening session is created locally on the tablet.
6. The patient completes the PHQ-2 questionnaire.
7. Answers are saved locally in real time as each response is entered.
8. The PHQ-2 score is calculated entirely on the tablet without requiring an internet connection.
9. The application evaluates the PHQ-2 score.
10. If the PHQ-2 score is below the configured threshold, the screening is completed, the result and interpretation are displayed to the patient, and the assessment is queued for synchronization with the WEMA backend.
11. If the PHQ-2 score meets or exceeds the configured threshold, the patient automatically proceeds to the PHQ-9 assessment without requiring a new registration or session.
12. The patient completes the PHQ-9 questionnaire.
13. PHQ-9 responses are continuously saved locally as they are entered.
14. The PHQ-9 score is calculated locally using the embedded scoring engine.
15. The patient's depression severity and clinical risk level are classified locally.
16. The assessment result and an appropriate clinical interpretation are displayed to the patient.
17. Based on the locally calculated risk level, the routing engine determines the next clinical action without waiting for backend communication.
18. The tablet checks the locally cached psychologist availability, room status, and waiting queue.
19. If an appropriate psychologist and consultation room are immediately available, the patient is assigned to the next available psychologist and directed to the allocated consultation room.
20. If all psychologists are currently engaged, the patient is placed into the local waiting queue according to clinical priority and estimated waiting time.
21. While waiting, the patient may be presented with approved psychoeducation content available on the tablet.
22. The completed assessment, patient registration, routing decision, queue information, and assignment are added to the local outbox for synchronization.
23. When network connectivity becomes available, all pending records are synchronized to the WEMA backend.
24. The backend validates the synchronized data, stores the patient and assessment as the permanent clinical record within WEMA, updates psychologist assignments and queue information, and records the complete audit trail.
25. If the assessment meets the configured high-risk criteria, the backend generates and sends a WhatsApp alert to the configured Mental Health response group.
26. The assigned psychologist accesses the patient's information through the Psychologist Portal, starts the consultation session, documents the consultation outcome, and marks the consultation as complete.
27. The consultation outcome is stored in WEMA as part of the patient's longitudinal mental health record.
28. Future counselling or review needs are recorded in the consultation outcome; appointment scheduling is deferred to MVP2.

---

## 3. Technology Stack

### 3.1 Frontend

| Layer                      | Technology                            | Notes                                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework                  | React + Vite + TypeScript             | Shared frontend foundation for the patient tablet application and psychologist portal, with strict typing across workflow, API, and domain models.                                                                                       |
| Patient application        | React Web App             | Browser-based screening application supporting EPDS and General Public workflows. Designed for offline-first operation using local storage and background synchronization.                                                                                                              |
| Offline layer              | Workbox Service Worker                | Pre-caches the application shell, questionnaire definitions, translations, and essential assets. Large audio and video files should be cached on demand rather than bundled into the initial installation.                               |
| Local storage              | IndexedDB via Dexie.js                | Stores cached Wonder patients, WEMA patients, screening sessions, assessment answers, scores, routing decisions, queue entries, assignments, resource snapshots, audit events, and local outbox records.                                 |
| Local outbox               | Custom Dexie-based outbox service     | Reliably stores locally created operations and synchronizes them with the backend when connectivity returns. Includes idempotency keys, retry counts, status tracking, and failure handling.                                             |
| HTTP client                | Axios                                 | Handles API communication, authentication headers, timeouts, standardized errors, and safe retries for idempotent requests. Offline clinical operations are handled by the local outbox rather than Axios interceptors alone.            |
| State management           | React Context and feature-level hooks | Manages active screening sessions, workflow state, authentication state, connectivity, synchronization status, and cached operational resources. A larger state library should only be introduced if application complexity requires it. |
| Internationalization       | react-i18next                         | Supports English, Kiswahili, and Luo. Translation resources can be updated independently from core application logic.                                                                                                                    |
| Validation                 | Zod                                   | Validates forms, local records, workflow configuration, and API payloads using shared schemas.                                                                                                                                           |
| Unit and component testing | Vitest + React Testing Library        | Tests questionnaire presentation, scoring, risk classification, routing, registration, local persistence, and portal components.                                                                                                         |
| End-to-end testing         | Playwright                            | Tests EPDS and PHQ-2/PHQ-9 workflows, offline screening, application restart, synchronization recovery, queue behaviour, route isolation, and psychologist portal operations.                                                            |


### 3.2 Backend

| Layer                       | Technology                                   | Notes                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime                     | Node.js + Express + TypeScript               | Hosts the REST API, workflow orchestration, synchronization endpoints, psychologist operations, and integration services.                                                                                                                                                                                                                                               |
| Database                    | PostgreSQL                                   | Primary system of record for WEMA-owned General Public patients, PHQ-2/PHQ-9 assessments, appointments, consultations, and notifications. It also stores temporary and operational EPDS data required for synchronization, routing, queue management, assignments, integration tracking, and auditing. Wonder remains the permanent clinical system of record for EPDS. |
| Database access             | Prisma ORM                                   | Provides typed database access, schema migrations, transactions, and maintainable repository implementations.                                                                                                                                                                                                                                                           |
| API style                   | REST                                         | Versioned, resource-oriented endpoints with shared validation contracts and standardized error responses.                                                                                                                                                                                                                                                               |
| Request validation          | Zod                                          | Validates incoming API requests, synchronization payloads, workflow identifiers, assessment types, and integration responses.                                                                                                                                                                                                                                           |
| Workflow orchestration      | Dedicated workflow modules                   | Enforces the rules for `EPDS_WONDER` and `GENERAL_PUBLIC_PHQ`, including patient source, assessment sequence, data ownership, integration target, and notification ownership.                                                                                                                                                                                           |
| Background processing       | PostgreSQL-backed job queue, such as pg-boss | Runs asynchronous jobs without requiring Redis during MVP1. Supports persistence, retries, delayed execution, job locking, and failure tracking.                                                                                                                                                                                                                        |
| Backend jobs                | Dedicated worker processes                   | Handles `REFRESH_WONDER_PATIENTS`, `PUSH_EPDS_TO_WONDER`, `SEND_GENERAL_PUBLIC_WHATSAPP_ALERT`, `RETRY_FAILED_SYNCHRONIZATION`, and `WRITE_AUDIT_LOG`.                                                                                                                                                                                                                  |
| Wonder integration          | Dedicated Wonder adapter module              | Isolates Wonder authentication, patient-list retrieval, request/response mapping, EPDS result submission, error normalization, and retry behaviour from the rest of WEMA.                                                                                                                                                                                               |
| WhatsApp integration        | Dedicated notification adapter               | Sends high-risk alerts for the General Public workflow only. The adapter must not send alerts for EPDS assessments.                                                                                                                                                                                                                                                     |
| Logging                     | Pino                                         | Produces structured JSON logs with correlation IDs, workflow identifiers, job identifiers, integration status, and sensitive-field redaction.                                                                                                                                                                                                                           |
| Psychologist authentication | JWT access tokens                            | Used for authenticated psychologist portal sessions. Prefer short-lived access tokens and a secure session renewal mechanism.                                                                                                                                                                                                                                           |
| Tablet authentication       | Registered device credentials                | Patient tablets do not use patient login. Each tablet is registered to a facility and authenticates using a device identifier and securely stored device credential.                                                                                                                                                                                                    |
| Authorization               | Role-based and context-based access control  | Enforces user role, facility, workflow, and device boundaries. MVP1 roles should remain limited to those actually required.                                                                                                                                                                                                                                             |
| Audit logging               | Append-only audit service                    | Records consent, assessment completion, risk classification, routing, assignment, consultation actions, synchronization outcomes, authentication events, and integration attempts.                                                                                                                                                                                      |
| API documentation           | OpenAPI / Swagger                            | Documents frontend, synchronization, psychologist portal, and integration-facing endpoints.                                                                                                                                                                                                                                                                             |
| Testing                     | Vitest or Jest + Supertest                   | Tests API contracts, workflow enforcement, authorization, synchronization idempotency, job execution, Wonder mapping, and notification isolation.                                                                                                                                                                                                                       |


### 3.3 Infrastructure & Operations

| Concern | Technology / Approach | MVP1 Notes |
|---|---|---|
| Containerization | Docker | Containerize the WEMA backend API, background workers, and PostgreSQL-related services. The React applications can run outside Docker during active development and be built as static production assets for deployment. |
| Local orchestration | Docker Compose | Runs PostgreSQL, backend API, background workers, and supporting services consistently in local development and testing environments. |
| CI/CD | GitHub Actions or equivalent | Every pull request should run linting, type checking, unit tests, integration tests, and production builds before code can be merged or deployed. |
| Error monitoring | Sentry or equivalent | Captures frontend crashes, backend exceptions, synchronization failures, and worker errors. Sensitive patient information must not be included in error payloads. |
| Application logging | Pino structured logs | Produces structured JSON logs for the backend API and workers, including correlation IDs, workflow type, job status, and integration outcomes. Sensitive fields must be redacted. |
| Log collection | Deployment-platform logs or centralized log aggregator | For MVP1, logs may initially be collected through the hosting platform or container runtime. A dedicated log aggregation platform may be introduced as deployment complexity increases. |
| Database backups | Automated PostgreSQL backups | Perform scheduled encrypted backups, define retention periods, and regularly test that backups can actually be restored. |
| Health checks | `/health` and `/health/deep` endpoints | `/health` confirms that the service process is running. `/health/deep` checks critical dependencies such as PostgreSQL and the background-job system. External services such as Wonder should be reported separately rather than making the entire service unhealthy during a temporary Wonder outage. |
| Secrets management | Environment-variable injection through deployment secrets | Database credentials, JWT secrets, device credentials, Wonder credentials, and notification-provider secrets must never be committed to source control. |
| Environment separation | Development, staging, and production environments | Each environment should use separate databases, credentials, configuration, Wonder endpoints, and notification destinations. |
| Deployment configuration | Environment-specific configuration and database seed data | Facility identifiers, rooms, workflow settings, clinical thresholds, supported languages, and integration details should be managed through controlled configuration rather than hard-coded values. |
| Security scanning | Dependency and container-image scanning | Use tools such as Dependabot and container scanning to identify vulnerable packages and base images before deployment. |
| Database migrations | Prisma migrations executed during controlled deployment | Database schema changes should be versioned, reviewed, backed up, and applied before the new application version starts serving requests. |

### 3.4 Containerization Strategy — Recommendation

**Recommendation: begin containerizing from Phase 1, but keep it lightweight.The goal is to make every developer run the same backend environment while keeping frontend development fast and simple.**

For WEMA, instead of telling every developer:

- install PostgreSQL manually(PostgreSQL)
- configure the database manually(Backend API)
- install the exact Node version,
- set up workers manually(Background workers)

you provide a Docker setup that starts the required services consistently.

- **Why start early:** WEMA's backend has multiple moving parts from day one — API server, background workers, PostgreSQL, and (soon) the Wonder adapter's own configuration. Establishing Docker Compose in Phase 1 means every developer runs an identical environment from the first commit, and staging/production Dockerfiles are refined incrementally rather than retrofitted under deadline pressure later. Retrofitting containerization after MVP1 is functionally complete is a known source of "works on my machine" defects and wasted QA cycles.
- **What should be containerized:** PostgreSQL, the backend API server, and background workers. Each gets its own Dockerfile and Compose service.
- **Local development:** Docker Compose brings up Postgres + backend + workers with one command. Environment variables are supplied via a `.env.example`-derived local `.env` file, never committed.
- **Frontend in a container? No, not during active development.** The React/Vite app should run natively on the developer's machine (`npm run dev`) for fast hot-module-reload; containerizing it adds file-watching overhead and volume-mount friction with negligible benefit at this stage. It **should** be containerized (or built into a static bundle served by Nginx) for staging and production, where the goal is a reproducible, immutable artifact rather than fast iteration.
- **Staging vs. production differences:** Staging uses the same images as production but with seeded test data, verbose logging, and relaxed rate limits, wired to a Wonder **sandbox/test** endpoint. Production uses hardened images (multi-stage builds, no dev dependencies), strict logging levels, real secrets, and the live Wonder endpoint.
- **PostgreSQL, backend, and workers** run as separate containers/services in all environments beyond local dev, so they can be scaled and restarted independently; in production, PostgreSQL should be a managed service (e.g., managed Postgres) rather than a self-hosted container, for backup and failover guarantees.

---

## 4. Repository & File Structure

### 4.1 Recommendation: Monorepo

**Recommendation: a single monorepo containing the patient app, psychologist portal, backend, and shared packages.**

Rationale: WEMA's frontend and backend evolve together tightly — a scoring-rule change, a new screening tool, or a Wonder field mapping change typically touches shared types, backend validation, and frontend forms simultaneously. A monorepo lets these change together in one PR with one CI run, avoids version-skew between a shared `types` package and its consumers, and is far easier for a small team to onboard into ("clone one repo, run one script") than coordinating across multiple repositories with independent release cadences. Given the team size implied by the role list in this roadmap, the coordination overhead of separate repos would outweigh any isolation benefit.

### 4.2 Proposed Directory Tree

```
wema/
├── frontend/
│   ├── patient-app/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── routes.tsx
│   │   │   │   ├── providers.tsx
│   │   │   │   └── error-boundary.tsx
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── language/
│   │   │   │   ├── consent/
│   │   │   │   ├── patient-identification/
│   │   │   │   ├── manual-registration/
│   │   │   │   │
│   │   │   │   ├── screening/
│   │   │   │   │   ├── shared/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── navigation/
│   │   │   │   │   │   └── session/
│   │   │   │   │   │
│   │   │   │   │   ├── epds/
│   │   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   ├── services/
│   │   │   │   │   │   └── tests/
│   │   │   │   │   │
│   │   │   │   │   ├── phq2/              # MVP2
│   │   │   │   │   ├── pcl/               # MVP2
│   │   │   │   │   └── dast/              # MVP2
│   │   │   │   │
│   │   │   │   ├── results/
│   │   │   │   ├── routing/
│   │   │   │   ├── room-assignment/
│   │   │   │   ├── waiting-queue/
│   │   │   │   ├── psychoeducation/
│   │   │   │   ├── media-player/
│   │   │   │   ├── audio/
│   │   │   │   ├── avatar/
│   │   │   │   └── session-reset/
│   │   │   │
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── layouts/
│   │   │   │   ├── utils/
│   │   │   │   └── constants/
│   │   │   │
│   │   │   ├── local/
│   │   │   │   ├── db/
│   │   │   │   │   ├── schema.ts
│   │   │   │   │   ├── migrations.ts
│   │   │   │   │   └── database.ts
│   │   │   │   ├── repositories/
│   │   │   │   ├── outbox/
│   │   │   │   ├── sync/
│   │   │   │   ├── event-bus/
│   │   │   │   ├── connectivity/
│   │   │   │   └── service-worker/
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   └── errors.ts
│   │   │   │
│   │   │   ├── i18n/
│   │   │   │   ├── config.ts
│   │   │   │   └── resources.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   └── main.tsx
│   │   │
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   └── offline/
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── psychologist-portal/
│       ├── src/
│       │   ├── app/
│       │   │   ├── App.tsx
│       │   │   ├── routes.tsx
│       │   │   ├── providers.tsx
│       │   │   └── protected-route.tsx
│       │   │
│       │   ├── features/
│       │   │   ├── authentication/
│       │   │   ├── profile/
│       │   │   ├── shift/
│       │   │   ├── availability/
│       │   │   ├── room/
│       │   │   ├── assignments/
│       │   │   ├── consultations/
│       │   │   ├── queue/
│       │   │   ├── audit-history/
│       │   │   │
│       │   │   ├── dashboard/              # MVP2
│       │   │   ├── high-risk-cases/        # MVP2
│       │   │   ├── scheduling/             # MVP2
│       │   │   ├── reports/                # MVP2
│       │   │   └── exports/                # MVP2
│       │   │
│       │   ├── shared/
│       │   │   ├── components/
│       │   │   ├── hooks/
│       │   │   ├── layouts/
│       │   │   └── utils/
│       │   │
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   ├── auth.ts
│       │   │   └── psychologist.ts
│       │   │
│       │   ├── auth/
│       │   │   ├── token-storage.ts
│       │   │   └── session.ts
│       │   │
│       │   ├── i18n/
│       │   ├── types/
│       │   └── main.tsx
│       │
│       ├── public/
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── devices/
│   │   │   ├── facilities/
│   │   │   ├── patients/
│   │   │   ├── screening-sessions/
│   │   │   ├── assessments/
│   │   │   ├── assessment-tools/
│   │   │   ├── psychologists/
│   │   │   ├── availability/
│   │   │   ├── rooms/
│   │   │   ├── assignments/
│   │   │   ├── consultations/
│   │   │   ├── queue/
│   │   │   ├── scheduling/                 # MVP2-ready
│   │   │   ├── reports/                    # MVP2-ready
│   │   │   ├── exports/                    # MVP2-ready
│   │   │   ├── synchronization/
│   │   │   ├── notifications/
│   │   │   ├── integration-routing/
│   │   │   ├── wonder/
│   │   │   ├── media/
│   │   │   ├── configuration/
│   │   │   ├── audit/
│   │   │   └── health/
│   │   │
│   │   ├── workers/
│   │   │   ├── handlers/
│   │   │   │   ├── update-wonder.handler.ts
│   │   │   │   ├── send-whatsapp.handler.ts
│   │   │   │   ├── write-audit.handler.ts
│   │   │   │   ├── process-notification.handler.ts
│   │   │   │   └── generate-report.handler.ts     # MVP2
│   │   │   ├── job-runner.ts
│   │   │   ├── retry-policy.ts
│   │   │   └── worker.ts
│   │   │
│   │   ├── database/
│   │   │   ├── connection.ts
│   │   │   ├── transaction.ts
│   │   │   └── repositories/
│   │   │
│   │   ├── middleware/
│   │   │   ├── authentication.ts
│   │   │   ├── authorization.ts
│   │   │   ├── validation.ts
│   │   │   ├── request-id.ts
│   │   │   ├── logging.ts
│   │   │   └── error-handler.ts
│   │   │
│   │   ├── config/
│   │   │   ├── environment.ts
│   │   │   ├── database.ts
│   │   │   ├── wonder.ts
│   │   │   ├── whatsapp.ts
│   │   │   └── security.ts
│   │   │
│   │   ├── shared/
│   │   │   ├── errors/
│   │   │   ├── utils/
│   │   │   ├── constants/
│   │   │   └── types/
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── migrations/
│   ├── seeds/
│   │   ├── facilities/
│   │   ├── rooms/
│   │   ├── psychologists/
│   │   ├── configuration/
│   │   ├── assessment-tools/
│   │   └── media/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   ├── api/
│   │   └── contract/
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── shared/
│   ├── types/
│   │   ├── patient.ts
│   │   ├── screening-session.ts
│   │   ├── assessment.ts
│   │   ├── assessment-tool.ts
│   │   ├── psychologist.ts
│   │   ├── room.ts
│   │   ├── assignment.ts
│   │   ├── queue.ts
│   │   ├── scheduling.ts
│   │   ├── reporting.ts
│   │   ├── synchronization.ts
│   │   └── api.ts
│   │
│   ├── validation/
│   │   ├── patient.schema.ts
│   │   ├── screening-session.schema.ts
│   │   ├── assessment.schema.ts
│   │   ├── assessment-tool.schema.ts
│   │   ├── psychologist.schema.ts
│   │   └── synchronization.schema.ts
│   │
│   ├── scoring/
│   │   ├── common/
│   │   │   ├── scoring.types.ts
│   │   │   ├── risk.types.ts
│   │   │   └── scoring.interface.ts
│   │   │
│   │   ├── epds/
│   │   │   ├── questions.ts
│   │   │   ├── scoring.ts
│   │   │   ├── rules.ts
│   │   │   ├── types.ts
│   │   │   └── tests.ts
│   │   │
│   │   ├── phq2/                         # MVP2
│   │   ├── pcl/                          # MVP2
│   │   └── dast/                         # MVP2
│   │
│   ├── clinical-rules/
│   │   ├── common/
│   │   │   ├── risk-classification.ts
│   │   │   ├── routing-result.ts
│   │   │   └── rule-version.ts
│   │   │
│   │   ├── epds/
│   │   │   ├── routing-rules.ts
│   │   │   ├── clinical-messages.ts
│   │   │   └── rule-versions.ts
│   │   │
│   │   ├── phq2/                         # MVP2
│   │   ├── pcl/                          # MVP2
│   │   └── dast/                         # MVP2
│   │
│   ├── integration-targets/
│   │   ├── integration-target.ts
│   │   ├── wonder.target.ts
│   │   └── wema-only.target.ts
│   │
│   ├── api-contracts/
│   │   ├── sync.contracts.ts
│   │   ├── assessment.contracts.ts
│   │   ├── psychologist.contracts.ts
│   │   ├── report.contracts.ts
│   │   └── wonder.contracts.ts
│   │
│   ├── ui/
│   └── config/
│
├── content/
│   ├── translations/
│   │   ├── en/
│   │   │   ├── common.json
│   │   │   ├── consent.json
│   │   │   ├── screening/
│   │   │   │   ├── epds.json
│   │   │   │   ├── phq2.json             # MVP2
│   │   │   │   ├── pcl.json              # MVP2
│   │   │   │   └── dast.json             # MVP2
│   │   │   ├── results.json
│   │   │   └── routing.json
│   │   ├── sw/
│   │   └── luo/
│   │
│   ├── audio/
│   │   ├── en/
│   │   │   ├── consent/
│   │   │   ├── screening/
│   │   │   │   ├── epds/
│   │   │   │   ├── phq2/                 # MVP2
│   │   │   │   ├── pcl/                  # MVP2
│   │   │   │   └── dast/                 # MVP2
│   │   │   ├── results/
│   │   │   └── routing/
│   │   ├── sw/
│   │   └── luo/
│   │
│   ├── avatar/
│   │   ├── assets/
│   │   ├── animations/
│   │   ├── scripts/
│   │   │   ├── en/
│   │   │   │   └── screening/
│   │   │   │       ├── epds/
│   │   │   │       ├── phq2/             # MVP2
│   │   │   │       ├── pcl/              # MVP2
│   │   │   │       └── dast/             # MVP2
│   │   │   ├── sw/
│   │   │   └── luo/
│   │   └── manifest.json
│   │
│   ├── video/
│   │   ├── en/
│   │   ├── sw/
│   │   └── luo/
│   │
│   ├── clinical-messages/
│   │   ├── en/
│   │   │   ├── epds.json
│   │   │   ├── phq2.json                 # MVP2
│   │   │   ├── pcl.json                  # MVP2
│   │   │   └── dast.json                 # MVP2
│   │   ├── sw/
│   │   └── luo/
│   │
│   └── manifests/
│       ├── audio.json
│       ├── avatar.json
│       ├── video.json
│       ├── screening-tools.json
│       └── content-version.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── frontend.Dockerfile
│   │   ├── worker.Dockerfile
│   │   └── nginx.conf
│   │
│   ├── deployment/
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   │
│   ├── monitoring/
│   │   ├── dashboards/
│   │   ├── alerts/
│   │   └── sentry/
│   │
│   ├── backups/
│   │   ├── backup-script/
│   │   ├── restore-script/
│   │   └── restore-test/
│   │
│   └── security/
│       ├── secrets/
│       └── policies/
│
├── docs/
│   ├── architecture/
│   │   ├── technical-design.md
│   │   ├── implementation-roadmap.md
│   │   └── decisions/
│   ├── api/
│   ├── database/
│   ├── clinical/
│   │   ├── mvp1/
│   │   └── mvp2/
│   ├── testing/
│   ├── deployment/
│   ├── security/
│   └── runbooks/
│       ├── sync-failure.md
│       ├── wonder-outage.md
│       ├── whatsapp-failure.md
│       ├── tablet-replacement.md
│       └── rollback.md
│
├── scripts/
│   ├── setup/
│   ├── database/
│   ├── content/
│   ├── testing/
│   └── maintenance/
│
├── .github/
│   ├── workflows/
│   │   ├── pull-request.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
├── CONTRIBUTING.md
└── README.md
```

### 4.3 Folder-by-Folder Notes

### 4.3.1 Root Repository

| Folder / File        | Purpose                                  | Details                                                                                                                                                                                     | Primary Owner                                    |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `wema/`              | Root monorepo                            | Contains the complete WEMA codebase, applications, backend, shared packages, content, infrastructure, documentation, scripts, and automation. Every team member clones this one repository. | Technical Lead / Project Manager                 |
| `frontend/`          | Frontend applications                    | Contains all user-facing React applications. WEMA has two interfaces: the patient self-screening app and the psychologist portal.                                                           | Frontend Developer                               |
| `backend/`           | Backend application                      | Contains the Node.js and Express API, PostgreSQL access, synchronization, background jobs, Wonder integration, psychologist availability, queue management, and notifications.              | Backend Developer                                |
| `shared/`            | Reusable shared code                     | Contains code that must remain consistent between frontend and backend, including types, validation, scoring, clinical rules, API contracts, and shared configuration.                      | Technical Lead / Frontend and Backend Developers |
| `content/`           | Clinical and media content               | Contains translations, audio, avatar scripts and assets, videos, clinical messages, and media manifests. It separates approved content from application logic.                              | UI/UX Designer / Clinical Representative         |
| `infrastructure/`    | Deployment and operational configuration | Contains Docker, environment deployment files, monitoring, backups, and security-related infrastructure configuration.                                                                      | QA / DevOps Engineer                             |
| `docs/`              | Project documentation                    | Contains architecture, API, database, clinical, testing, deployment, security, and operational documentation.                                                                               | Project Manager / Technical Lead                 |
| `scripts/`           | Utility and maintenance scripts          | Contains scripts for setup, database operations, content validation, testing, and ongoing system maintenance.                                                                               | Backend Developer / QA-DevOps                    |
| `.github/`           | GitHub automation and templates          | Contains CI/CD workflows, issue templates, and pull-request templates.                                                                                                                      | QA / DevOps Engineer                             |
| `.env.example`       | Environment-variable template            | Lists all required environment variables without including real credentials or secrets. Developers copy it to `.env` locally.                                                               | Backend Developer / QA-DevOps                    |
| `.gitignore`         | Git exclusion rules                      | Prevents secrets, local environment files, logs, generated builds, dependencies, and temporary files from being committed.                                                                  | Technical Lead                                   |
| `docker-compose.yml` | Local service orchestration              | Starts PostgreSQL, backend API, and background workers for local development using one command.                                                                                             | QA / DevOps Engineer                             |
| `package.json`       | Monorepo workspace configuration         | Defines root scripts, workspaces, shared dependencies, linting, testing, and build commands.                                                                                                | Technical Lead                                   |
| `tsconfig.base.json` | Base TypeScript configuration            | Provides shared TypeScript rules inherited by frontend, backend, and shared packages.                                                                                                       | Technical Lead                                   |
| `eslint.config.js`   | Shared linting rules                     | Defines coding-quality rules used by all TypeScript and React projects.                                                                                                                     | Technical Lead / QA-DevOps                       |
| `prettier.config.js` | Shared formatting rules                  | Ensures all code follows the same formatting standard.                                                                                                                                      | Technical Lead                                   |
| `CONTRIBUTING.md`    | Contribution guide                       | Explains branching, commits, pull requests, testing, code review, and contribution expectations.                                                                                            | Project Manager / Technical Lead                 |
| `README.md`          | Repository starting point                | Explains what WEMA is, how to set it up, how the repository is organized, and where to find detailed documentation.                                                                         | Project Manager / Technical Lead                 |


---

### 4.3.2 

| Folder / File                                     | Purpose                            | Details                                                                                                                                                                    | Primary Owner      |
| ------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `frontend/patient-app/`                           | Patient self-screening application | Offline-first React application used on hospital tablets for patient identification, consent, EPDS screening, results, routing, queue, audio, avatar, and psychoeducation. | Frontend Developer |
| `frontend/patient-app/src/`                       | Patient-app source code            | Contains all application code for the patient-facing interface.                                                                                                            | Frontend Developer |
| `frontend/patient-app/src/app/`                   | Application bootstrap              | Contains application startup, global providers, route setup, and top-level error handling.                                                                                 | Frontend Developer |
| `frontend/patient-app/src/app/App.tsx`            | Root React component               | Mounts the main patient application and renders the configured routes.                                                                                                     | Frontend Developer |
| `frontend/patient-app/src/app/routes.tsx`         | Route definitions                  | Defines navigation between language, consent, patient search, registration, screening, results, queue, and completion screens.                                             | Frontend Developer |
| `frontend/patient-app/src/app/providers.tsx`      | Global providers                   | Registers global services such as router, translation provider, state provider, error monitoring, and theme.                                                               | Frontend Developer |
| `frontend/patient-app/src/app/error-boundary.tsx` | Global frontend error protection   | Prevents an unexpected React error from breaking the entire patient session and displays a safe recovery screen.                                                           | Frontend Developer |

---

### 4.3.3 Patient Features

| Folder / File                                     | Purpose                            | Details                                                                                                                                                                    | Primary Owner      |
| ------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `frontend/patient-app/`                           | Patient self-screening application | Offline-first React application used on hospital tablets for patient identification, consent, EPDS screening, results, routing, queue, audio, avatar, and psychoeducation. | Frontend Developer |
| `frontend/patient-app/src/`                       | Patient-app source code            | Contains all application code for the patient-facing interface.                                                                                                            | Frontend Developer |
| `frontend/patient-app/src/app/`                   | Application bootstrap              | Contains application startup, global providers, route setup, and top-level error handling.                                                                                 | Frontend Developer |
| `frontend/patient-app/src/app/App.tsx`            | Root React component               | Mounts the main patient application and renders the configured routes.                                                                                                     | Frontend Developer |
| `frontend/patient-app/src/app/routes.tsx`         | Route definitions                  | Defines navigation between language, consent, patient search, registration, screening, results, queue, and completion screens.                                             | Frontend Developer |
| `frontend/patient-app/src/app/providers.tsx`      | Global providers                   | Registers global services such as router, translation provider, state provider, error monitoring, and theme.                                                               | Frontend Developer |
| `frontend/patient-app/src/app/error-boundary.tsx` | Global frontend error protection   | Prevents an unexpected React error from breaking the entire patient session and displays a safe recovery screen.                                                           | Frontend Developer |
 ---

 ### 4.3.4 Patient-App Shared Code


| Folder                                  | Purpose                        | Details                                                                                                                                                                         | Primary Owner                                |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `frontend/patient-app/src/features/`    | Patient workflow modules       | Organizes the patient app by business feature rather than by technical file type. Each feature should contain its own components, hooks, services, and tests where appropriate. | Frontend Developer                           |
| `features/language/`                    | Language selection             | Implements English, Kiswahili, and Luo selection and stores the patient’s chosen language for the current session.                                                              | Frontend Developer                           |
| `features/consent/`                     | Consent workflow               | Displays the approved consent statement, records consent locally, and prevents screening until consent is captured.                                                             | Frontend Developer / Clinical Representative |
| `features/patient-identification/`      | Patient search and matching    | Searches the locally synchronized Wonder patient list using patient identifiers such as name, phone number, national ID, or Wonder patient number.                              | Frontend Developer                           |
| `features/manual-registration/`         | Fallback registration          | Allows patients not found in Wonder to be registered locally and proceed immediately to EPDS screening without waiting for internet.                                            | Frontend Developer                           |
| `features/screening/`                   | Screening-tool framework       | Contains shared screening behavior and individual assessment tools. It is designed so MVP2 tools can be added without reorganizing the app.                                     | Frontend Developer / Technical Lead          |
| `features/screening/shared/`            | Shared screening behavior      | Contains reusable question navigation, progress, answer persistence, validation, session handling, and common screening UI.                                                     | Frontend Developer                           |
| `features/screening/shared/components/` | Shared screening UI components | Reusable components such as question cards, answer options, progress bars, navigation controls, and completion prompts.                                                         | Frontend Developer                           |
| `features/screening/shared/hooks/`      | Shared screening hooks         | Hooks for answer management, autosave, navigation, progress calculation, and resume behavior.                                                                                   | Frontend Developer                           |
| `features/screening/shared/navigation/` | Question navigation logic      | Controls next, previous, validation before movement, section transitions, and incomplete-answer handling.                                                                       | Frontend Developer                           |
| `features/screening/shared/session/`    | Screening-session handling     | Creates, resumes, completes, and resets screening sessions.                                                                                                                     | Frontend Developer                           |
| `features/screening/epds/`              | EPDS implementation            | Contains the MVP1 EPDS screens, question rendering, local answer capture, scoring integration, and EPDS-specific tests.                                                         | Frontend Developer / Clinical Representative |
| `features/screening/phq2/`              | Future PHQ-2 module            | Reserved for MVP2 depression screening. Should not contain implementation during MVP1 unless work officially begins.                                                            | Frontend Developer                           |
| `features/screening/pcl/`               | Future PCL module              | Reserved for MVP2 trauma screening.                                                                                                                                             | Frontend Developer                           |
| `features/screening/dast/`              | Future DAST module             | Reserved for MVP2 substance-use screening.                                                                                                                                      | Frontend Developer                           |
| `features/results/`                     | Screening results              | Displays score, risk level, clinical interpretation, and patient-facing messages.                                                                                               | Frontend Developer / Clinical Representative |
| `features/routing/`                     | Clinical next-step routing     | Interprets the risk classification and determines whether the patient finishes, is assigned to a psychologist, or enters the waiting queue.                                     | Frontend Developer / Backend Developer       |
| `features/room-assignment/`             | Room instructions              | Displays the assigned psychologist, room name or number, and directions to the patient.                                                                                         | Frontend Developer                           |
| `features/waiting-queue/`               | Queue experience               | Shows queue position, estimated waiting time, and status updates when no psychologist is immediately available.                                                                 | Frontend Developer                           |
| `features/psychoeducation/`             | Waiting-time education         | Controls the psychoeducation experience shown while a patient waits.                                                                                                            | Frontend Developer / Clinical Representative |
| `features/media-player/`                | Unified media playback         | Provides common controls and fallback behavior for audio, avatar, and video content.                                                                                            | Frontend Developer                           |
| `features/audio/`                       | Audio interaction              | Handles play, pause, repeat, language-specific narration, missing-file fallbacks, and offline audio playback.                                                                   | Frontend Developer                           |
| `features/avatar/`                      | Avatar interaction             | Controls avatar presentation, scripted prompts, animations, and fallback to text or audio when the avatar is unavailable.                                                       | Frontend Developer / UI/UX Designer          |
| `features/session-reset/`               | Shared-device privacy reset    | Clears the previous patient’s visible session data, resets routes, stops media, and returns the tablet to the starting screen.                                                  | Frontend Developer                           |


---

### 4.3.5 Patient Local-First Infrastructure


| Folder                             | Purpose                   | Details                                                                                                     | Primary Owner                       |
| ---------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `frontend/patient-app/src/shared/` | Patient-app reusable code | Contains reusable code used by multiple patient features but not necessarily by the psychologist portal.    | Frontend Developer                  |
| `shared/components/`               | Reusable UI elements      | Buttons, cards, dialogs, form controls, status banners, loaders, and other reusable patient-app components. | Frontend Developer                  |
| `shared/hooks/`                    | Reusable React hooks      | Common hooks for timers, media, session timeout, connectivity, and application lifecycle.                   | Frontend Developer                  |
| `shared/layouts/`                  | Page layouts              | Defines consistent tablet screen layout, headers, footers, content spacing, and safe-screen containers.     | Frontend Developer / UI/UX Designer |
| `shared/utils/`                    | Utility functions         | General-purpose helper functions that are not clinical rules or feature-specific logic.                     | Frontend Developer                  |
| `shared/constants/`                | Frontend constants        | Route names, timeout values, storage keys, status labels, and frontend-only constants.                      | Frontend Developer                  |
---

### 4.3.6 Patient API and Internatinalization


| Folder / File                     | Purpose                      | Details                                                                                                                                        | Primary Owner                          |
| --------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `frontend/patient-app/src/local/` | Offline-first infrastructure | Contains IndexedDB, local repositories, outbox, synchronization, event bus, connectivity, and service-worker code.                             | Frontend Developer                     |
| `local/db/`                       | IndexedDB implementation     | Contains Dexie database definitions, versions, migrations, and database initialization.                                                        | Frontend Developer                     |
| `local/db/schema.ts`              | Local database schema        | Defines IndexedDB tables, indexes, and record structures.                                                                                      | Frontend Developer                     |
| `local/db/migrations.ts`          | Local database migrations    | Handles safe upgrades of IndexedDB when the local schema changes.                                                                              | Frontend Developer                     |
| `local/db/database.ts`            | Database initialization      | Creates and exports the Dexie database instance.                                                                                               | Frontend Developer                     |
| `local/repositories/`             | Local data-access layer      | Provides clean functions for reading and writing patients, assessments, answers, rooms, psychologists, queue entries, and other local records. | Frontend Developer                     |
| `local/outbox/`                   | Pending outbound work        | Stores local jobs that must be synchronized later, such as assessments, registrations, assignments, audit events, and alert requests.          | Frontend Developer                     |
| `local/sync/`                     | Synchronization engine       | Uploads outbox records, downloads server changes, resolves responses, updates local sync state, and handles retries.                           | Frontend Developer / Backend Developer |
| `local/event-bus/`                | Internal event communication | Allows modules to publish and subscribe to events such as assessment completion, connectivity changes, routing decisions, and sync results.    | Frontend Developer                     |
| `local/connectivity/`             | Network-state monitoring     | Detects online and offline transitions and triggers synchronization when connectivity returns.                                                 | Frontend Developer                     |
| `local/service-worker/`           | Offline application shell    | Registers and configures Workbox caching for HTML, JavaScript, styles, translations, audio, avatar assets, and videos.                         | Frontend Developer / QA-DevOps         |


---

### 4.3.7 Patient-App Public Files and Tests


| Folder / File                       | Purpose                           | Details                                                                                                     | Primary Owner      |
| ----------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| `frontend/patient-app/src/api/`     | Backend communication             | Contains the patient app’s API client and endpoint definitions. It never communicates directly with Wonder. | Frontend Developer |
| `api/client.ts`                     | Axios client                      | Configures the backend base URL, timeouts, headers, device authentication, and response interceptors.       | Frontend Developer |
| `api/endpoints.ts`                  | Endpoint definitions              | Centralizes endpoint paths so they are not hardcoded throughout components.                                 | Frontend Developer |
| `api/errors.ts`                     | API error mapping                 | Converts backend errors into safe, understandable application error types.                                  | Frontend Developer |
| `frontend/patient-app/src/i18n/`    | Translation configuration         | Configures `react-i18next` and connects application keys to approved language resources.                    | Frontend Developer |
| `i18n/config.ts`                    | i18n setup                        | Defines supported languages, fallback language, namespaces, and loading behavior.                           | Frontend Developer |
| `i18n/resources.ts`                 | Translation resource registration | Imports or maps translation files into the application.                                                     | Frontend Developer |
| `frontend/patient-app/src/types/`   | Patient-app-only types            | Contains local types not appropriate for the global shared package.                                         | Frontend Developer |
| `frontend/patient-app/src/main.tsx` | Browser entry point               | Mounts the React application and registers the service worker and global providers.                         | Frontend Developer |



---

### 4.3.8 Psychologist Portal

| Folder / File                       | Purpose                           | Details                                                                                                     | Primary Owner      |
| ----------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| `frontend/patient-app/src/api/`     | Backend communication             | Contains the patient app’s API client and endpoint definitions. It never communicates directly with Wonder. | Frontend Developer |
| `api/client.ts`                     | Axios client                      | Configures the backend base URL, timeouts, headers, device authentication, and response interceptors.       | Frontend Developer |
| `api/endpoints.ts`                  | Endpoint definitions              | Centralizes endpoint paths so they are not hardcoded throughout components.                                 | Frontend Developer |
| `api/errors.ts`                     | API error mapping                 | Converts backend errors into safe, understandable application error types.                                  | Frontend Developer |
| `frontend/patient-app/src/i18n/`    | Translation configuration         | Configures `react-i18next` and connects application keys to approved language resources.                    | Frontend Developer |
| `i18n/config.ts`                    | i18n setup                        | Defines supported languages, fallback language, namespaces, and loading behavior.                           | Frontend Developer |
| `i18n/resources.ts`                 | Translation resource registration | Imports or maps translation files into the application.                                                     | Frontend Developer |
| `frontend/patient-app/src/types/`   | Patient-app-only types            | Contains local types not appropriate for the global shared package.                                         | Frontend Developer |
| `frontend/patient-app/src/main.tsx` | Browser entry point               | Mounts the React application and registers the service worker and global providers.                         | Frontend Developer |

---

### 4.3.9 Psychologist Shared, API, Auth, and Tests

| Folder                            | Purpose                               | Details                                                                                | Primary Owner                          |
| --------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| `psychologist-portal/src/shared/` | Reusable portal code                  | Contains common components, hooks, layouts, and helpers used across portal features.   | Frontend Developer                     |
| `shared/components/`              | Portal UI components                  | Status badges, queue tables, patient cards, confirmation dialogs, and form components. | Frontend Developer                     |
| `shared/hooks/`                   | Portal hooks                          | Reusable logic for authentication status, polling, timers, and data refresh.           | Frontend Developer                     |
| `shared/layouts/`                 | Portal page layouts                   | Dashboard, authenticated page shell, and navigation layouts.                           | Frontend Developer / UI/UX Designer    |
| `shared/utils/`                   | Portal helper functions               | Formatting and non-clinical utility logic.                                             | Frontend Developer                     |
| `psychologist-portal/src/api/`    | Portal API services                   | Contains backend requests for authentication and psychologist operations.              | Frontend Developer                     |
| `api/client.ts`                   | Authenticated Axios client            | Sends JWT-authenticated requests and handles token expiry.                             | Frontend Developer                     |
| `api/auth.ts`                     | Authentication requests               | Login, refresh, logout, and account session operations.                                | Frontend Developer                     |
| `api/psychologist.ts`             | Psychologist operations               | Availability, shifts, assignments, rooms, queue, and consultations.                    | Frontend Developer                     |
| `psychologist-portal/src/auth/`   | Client-side authentication management | Stores and manages authentication tokens and active portal sessions.                   | Frontend Developer                     |
| `auth/token-storage.ts`           | Token storage                         | Stores tokens using the approved secure browser approach.                              | Frontend Developer / Security Reviewer |
| `auth/session.ts`                 | Session lifecycle                     | Handles timeout, refresh, logout, and session validation.                              | Frontend Developer                     |
| `psychologist-portal/src/i18n/`   | Portal translation support            | Allows portal content to support multiple languages if required.                       | Frontend Developer                     |
| `psychologist-portal/src/types/`  | Portal-only types                     | Contains types specific to portal state and UI.                                        | Frontend Developer                     |
| `psychologist-portal/tests/`      | Portal testing                        | Unit, integration, and E2E tests for all psychologist workflows.                       | Frontend Developer / QA Engineer       |



---

### 4.4 Backend Root

| Folder                            | Purpose                               | Details                                                                                | Primary Owner                          |
| --------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------- |
| `psychologist-portal/src/shared/` | Reusable portal code                  | Contains common components, hooks, layouts, and helpers used across portal features.   | Frontend Developer                     |
| `shared/components/`              | Portal UI components                  | Status badges, queue tables, patient cards, confirmation dialogs, and form components. | Frontend Developer                     |
| `shared/hooks/`                   | Portal hooks                          | Reusable logic for authentication status, polling, timers, and data refresh.           | Frontend Developer                     |
| `shared/layouts/`                 | Portal page layouts                   | Dashboard, authenticated page shell, and navigation layouts.                           | Frontend Developer / UI/UX Designer    |
| `shared/utils/`                   | Portal helper functions               | Formatting and non-clinical utility logic.                                             | Frontend Developer                     |
| `psychologist-portal/src/api/`    | Portal API services                   | Contains backend requests for authentication and psychologist operations.              | Frontend Developer                     |
| `api/client.ts`                   | Authenticated Axios client            | Sends JWT-authenticated requests and handles token expiry.                             | Frontend Developer                     |
| `api/auth.ts`                     | Authentication requests               | Login, refresh, logout, and account session operations.                                | Frontend Developer                     |
| `api/psychologist.ts`             | Psychologist operations               | Availability, shifts, assignments, rooms, queue, and consultations.                    | Frontend Developer                     |
| `psychologist-portal/src/auth/`   | Client-side authentication management | Stores and manages authentication tokens and active portal sessions.                   | Frontend Developer                     |
| `auth/token-storage.ts`           | Token storage                         | Stores tokens using the approved secure browser approach.                              | Frontend Developer / Security Reviewer |
| `auth/session.ts`                 | Session lifecycle                     | Handles timeout, refresh, logout, and session validation.                              | Frontend Developer                     |
| `psychologist-portal/src/i18n/`   | Portal translation support            | Allows portal content to support multiple languages if required.                       | Frontend Developer                     |
| `psychologist-portal/src/types/`  | Portal-only types                     | Contains types specific to portal state and UI.                                        | Frontend Developer                     |
| `psychologist-portal/tests/`      | Portal testing                        | Unit, integration, and E2E tests for all psychologist workflows.                       | Frontend Developer / QA Engineer       |


---
### 4.4.1 Backend Modules

| Folder / File           | Purpose                          | Details                                                                                                                                | Primary Owner                            |
| ----------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `backend/`              | WEMA server application          | Contains the Express API, PostgreSQL integration, background workers, external integrations, authentication, and operational services. | Backend Developer                        |
| `backend/src/`          | Backend source code              | Contains modules, workers, database, middleware, configuration, and application startup.                                               | Backend Developer                        |
| `backend/src/modules/`  | Backend business modules         | Organizes backend logic into clear domain capabilities.                                                                                | Backend Developer                        |
| `backend/src/app.ts`    | Express application setup        | Registers middleware, routes, modules, logging, and error handling without starting the server.                                        | Backend Developer                        |
| `backend/src/server.ts` | Backend process entry point      | Starts the HTTP server and handles startup and shutdown signals.                                                                       | Backend Developer                        |
| `backend/Dockerfile`    | Backend container build          | Defines how the backend production container is built.                                                                                 | QA / DevOps Engineer / Backend Developer |
| `backend/tsconfig.json` | Backend TypeScript settings      | Extends root TypeScript configuration with backend-specific options.                                                                   | Backend Developer                        |
| `backend/package.json`  | Backend dependencies and scripts | Defines Express, PostgreSQL, JWT, Pino, testing, migration, build, and worker commands.                                                | Backend Developer                        |



----

### 4.4.2 Background Wokers

| Folder                         | Purpose                            | Details                                                                                                      | Primary Owner                             |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `modules/auth/`                | Authentication                     | Handles psychologist login, token generation, password validation, refresh, and logout.                      | Backend Developer                         |
| `modules/users/`               | Internal user accounts             | Manages users, roles, active status, and account-level information.                                          | Backend Developer                         |
| `modules/devices/`             | Tablet identity and trust          | Registers facility tablets, issues device credentials, tracks active devices, and supports revocation.       | Backend Developer / QA-DevOps             |
| `modules/facilities/`          | Facility configuration             | Stores hospital identity, timezone, business hours, and facility-level settings.                             | Backend Developer                         |
| `modules/patients/`            | Patient records                    | Stores Wonder-synchronized patient references and manually registered WEMA patients awaiting reconciliation. | Backend Developer                         |
| `modules/screening-sessions/`  | Screening-session lifecycle        | Tracks the overall screening session independently of the specific screening tool.                           | Backend Developer                         |
| `modules/assessments/`         | Assessment records                 | Stores assessment results, scores, risk levels, tool version, and submission status.                         | Backend Developer                         |
| `modules/assessment-tools/`    | Screening-tool registry            | Stores tool type, version, enabled status, integration target, supported languages, and configuration.       | Backend Developer / Technical Lead        |
| `modules/psychologists/`       | Psychologist profiles              | Stores psychologist identity, facility relationship, room eligibility, and active status.                    | Backend Developer                         |
| `modules/availability/`        | Psychologist status                | Manages available, assigned, busy, on-break, unavailable, and offline states.                                | Backend Developer                         |
| `modules/rooms/`               | Room management                    | Stores counselling-room details, active status, facility, and occupancy-related configuration.               | Backend Developer                         |
| `modules/assignments/`         | Patient-to-psychologist assignment | Creates and manages the link between patient, assessment, psychologist, room, and assignment status.         | Backend Developer                         |
| `modules/consultations/`       | Counselling sessions               | Tracks consultation start, completion, duration, psychologist, patient, and outcome.                         | Backend Developer                         |
| `modules/queue/`               | Waiting queue                      | Manages queue entries, priority, position, estimated wait time, and queue transitions.                       | Backend Developer                         |
| `modules/scheduling/`          | Future appointment scheduling      | Reserved for MVP2 clinic scheduling and appointment workflows.                                               | Backend Developer                         |
| `modules/reports/`             | Future reporting                   | Reserved for MVP2 summaries, filtering, and report generation.                                               | Backend Developer                         |
| `modules/exports/`             | Future export generation           | Reserved for MVP2 CSV, spreadsheet, or PDF export workflows.                                                 | Backend Developer                         |
| `modules/synchronization/`     | Tablet synchronization             | Implements upload, download, cursor, batch, idempotency, conflict, and sync-receipt logic.                   | Backend Developer                         |
| `modules/notifications/`       | Notification management            | Creates notification records, tracks status, and dispatches work to background jobs.                         | Backend Developer                         |
| `modules/integration-routing/` | Integration destination selection  | Determines whether an assessment goes to Wonder or remains WEMA-only.                                        | Backend Developer / Technical Lead        |
| `modules/wonder/`              | Wonder HMIS adapter                | Isolates Wonder authentication, patient retrieval, result submission, field mapping, and integration errors. | Backend Developer / Wonder Technical Team |
| `modules/media/`               | Media metadata                     | Manages audio, avatar, video, checksums, versions, URLs, and download manifests.                             | Backend Developer                         |
| `modules/configuration/`       | Application configuration          | Manages business hours, queue settings, consultation duration, clinical rule versions, and feature flags.    | Backend Developer                         |
| `modules/audit/`               | Audit trail                        | Records clinically significant actions, actor, entity, timestamp, and outcome.                               | Backend Developer                         |
| `modules/health/`              | Health checks                      | Provides liveness and readiness checks for monitoring and deployment systems.                                | Backend Developer / QA-DevOps             |


---

### 4.4.3 Backend Database, Middleware, and configuration

| Folder / File                  | Purpose                        | Details                                                                              | Primary Owner                         |
| ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------- |
| `backend/src/database/`        | PostgreSQL access              | Contains database connection, transactions, and shared repositories.                 | Backend Developer                     |
| `database/connection.ts`       | Database connection            | Creates and manages PostgreSQL connections.                                          | Backend Developer                     |
| `database/transaction.ts`      | Transaction handling           | Provides safe transaction helpers for assignment, consultation, and sync operations. | Backend Developer                     |
| `database/repositories/`       | Shared database repositories   | Contains reusable data-access logic that is not owned by one module.                 | Backend Developer                     |
| `backend/src/middleware/`      | Cross-cutting request handling | Applies authentication, authorization, validation, logging, IDs, and error handling. | Backend Developer                     |
| `middleware/authentication.ts` | Identity verification          | Validates JWT or device credentials.                                                 | Backend Developer                     |
| `middleware/authorization.ts`  | Permission enforcement         | Checks roles, facility boundaries, and allowed actions.                              | Backend Developer                     |
| `middleware/validation.ts`     | Request validation             | Validates request body, parameters, and query strings.                               | Backend Developer                     |
| `middleware/request-id.ts`     | Request traceability           | Adds a unique ID to each API request for logs and troubleshooting.                   | Backend Developer                     |
| `middleware/logging.ts`        | Request logging                | Records structured request and response metadata while masking sensitive values.     | Backend Developer                     |
| `middleware/error-handler.ts`  | Central error handling         | Converts internal errors into safe API responses.                                    | Backend Developer                     |
| `backend/src/config/`          | Backend configuration          | Loads and validates environment-specific settings.                                   | Backend Developer / QA-DevOps         |
| `config/environment.ts`        | Environment validation         | Ensures required environment variables exist and are valid.                          | Backend Developer                     |
| `config/database.ts`           | Database settings              | Defines PostgreSQL URL, pool size, timeout, and SSL settings.                        | Backend Developer                     |
| `config/wonder.ts`             | Wonder settings                | Stores Wonder endpoint, credentials reference, timeouts, and retry configuration.    | Backend Developer                     |
| `config/whatsapp.ts`           | WhatsApp settings              | Stores provider configuration and approved template identifiers.                     | Backend Developer                     |
| `config/security.ts`           | Security settings              | Defines JWT expiry, hashing, CORS, rate limits, and secure defaults.                 | Backend Developer / Security Reviewer |


---
### 4.4.4 Backend Shared Code, Migrations, Seeds, and Tests
| Folder                    | Purpose                               | Details                                                                               | Primary Owner                               |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `backend/src/shared/`     | Backend-only reusable code            | Contains reusable errors, helpers, constants, and types not shared with frontend.     | Backend Developer                           |
| `shared/errors/`          | Typed backend errors                  | Standardizes validation, authentication, conflict, integration, and not-found errors. | Backend Developer                           |
| `shared/utils/`           | Backend utilities                     | General backend helpers not tied to one module.                                       | Backend Developer                           |
| `shared/constants/`       | Backend constants                     | Job types, system status values, retry defaults, and internal constants.              | Backend Developer                           |
| `shared/types/`           | Backend-only types                    | Internal types not exposed through API contracts.                                     | Backend Developer                           |
| `backend/migrations/`     | PostgreSQL schema changes             | Stores ordered, reversible database migrations.                                       | Backend Developer                           |
| `backend/seeds/`          | Initial development and facility data | Contains seed content required to initialize environments.                            | Backend Developer                           |
| `seeds/facilities/`       | Facility seed data                    | Hospital identity and facility settings.                                              | Backend Developer / PM                      |
| `seeds/rooms/`            | Room seed data                        | Counselling rooms and status.                                                         | Backend Developer / Clinical Operations     |
| `seeds/psychologists/`    | Psychologist seed data                | Initial psychologist accounts or profiles for development and staging.                | Backend Developer                           |
| `seeds/configuration/`    | Operational configuration             | Business hours, queue duration, feature flags, and system defaults.                   | Backend Developer                           |
| `seeds/assessment-tools/` | Screening-tool configuration          | EPDS for MVP1 and future tool metadata for MVP2 when enabled.                         | Backend Developer / Clinical Representative |
| `seeds/media/`            | Media metadata                        | References to approved audio, avatar, and video assets.                               | Backend Developer / UI-UX                   |
| `backend/tests/`          | Backend testing                       | Contains unit, integration, API, and external-contract tests.                         | Backend Developer / QA Engineer             |
| `tests/unit/`             | Unit tests                            | Tests individual backend functions and services.                                      | Backend Developer                           |
| `tests/integration/`      | Database and module tests             | Tests modules with PostgreSQL and internal dependencies.                              | Backend Developer / QA Engineer             |
| `tests/api/`              | Endpoint tests                        | Tests routes, validation, auth, status codes, and responses.                          | QA Engineer / Backend Developer             |
| `tests/contract/`         | External contract tests               | Verifies WEMA’s assumptions about Wonder and notification-provider contracts.         | Backend Developer / Wonder Technical Team   |


---

### 4.4.5 Shared Types, Validations, Scoring and Clinical Rules

| Folder / File                       | Purpose                             | Details                                                                                                           | Primary Owner                                    |
| ----------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `shared/types/`                     | Cross-application domain types      | Keeps patient, assessment, psychologist, room, queue, scheduling, reporting, and sync data structures consistent. | Technical Lead / Frontend and Backend Developers |
| `shared/types/patient.ts`           | Patient types                       | Defines patient identity and source fields.                                                                       | Frontend and Backend Developers                  |
| `shared/types/screening-session.ts` | Screening-session types             | Defines session state independent of a specific tool.                                                             | Frontend and Backend Developers                  |
| `shared/types/assessment.ts`        | Assessment types                    | Defines tool type, answers, score, risk, status, and integration target.                                          | Frontend and Backend Developers                  |
| `shared/types/assessment-tool.ts`   | Tool registry types                 | Defines supported tool metadata and configuration.                                                                | Technical Lead                                   |
| `shared/types/psychologist.ts`      | Psychologist types                  | Defines psychologist profile and status structures.                                                               | Frontend and Backend Developers                  |
| `shared/types/room.ts`              | Room types                          | Defines room identity, facility, and status.                                                                      | Frontend and Backend Developers                  |
| `shared/types/assignment.ts`        | Assignment types                    | Defines patient-to-psychologist and room linkage.                                                                 | Frontend and Backend Developers                  |
| `shared/types/queue.ts`             | Queue types                         | Defines queue entry, position, priority, and status.                                                              | Frontend and Backend Developers                  |
| `shared/types/scheduling.ts`        | Future scheduling types             | Supports MVP2 appointments and counselling schedules.                                                             | Frontend and Backend Developers                  |
| `shared/types/reporting.ts`         | Future reporting types              | Supports MVP2 report filters and result structures.                                                               | Frontend and Backend Developers                  |
| `shared/types/synchronization.ts`   | Sync types                          | Defines outbox items, sync batches, receipts, conflicts, and statuses.                                            | Frontend and Backend Developers                  |
| `shared/types/api.ts`               | Common API types                    | Defines shared API response and error formats.                                                                    | Technical Lead                                   |
| `shared/validation/`                | Shared validation rules             | Ensures frontend and backend validate the same data consistently.                                                 | Frontend and Backend Developers                  |
| `shared/scoring/`                   | Screening score engines             | Contains pure, tool-specific scoring logic that works independently of React and Express.                         | Technical Lead / Clinical Representative         |
| `shared/scoring/common/`            | Shared scoring interfaces           | Defines common score input, score output, risk, and tool contracts.                                               | Technical Lead                                   |
| `shared/scoring/epds/`              | EPDS scoring                        | Contains approved EPDS questions, scoring, rule definitions, types, and tests.                                    | Frontend / Backend / Clinical Representative     |
| `shared/scoring/phq2/`              | Future PHQ-2 scoring                | Reserved for MVP2.                                                                                                | Frontend / Backend / Clinical Representative     |
| `shared/scoring/pcl/`               | Future PCL scoring                  | Reserved for MVP2.                                                                                                | Frontend / Backend / Clinical Representative     |
| `shared/scoring/dast/`              | Future DAST scoring                 | Reserved for MVP2.                                                                                                | Frontend / Backend / Clinical Representative     |
| `shared/clinical-rules/`            | Clinical interpretation and routing | Contains risk classification, routing outcomes, messages, and versioned clinical rules.                           | Technical Lead / Clinical Representative         |
| `clinical-rules/common/`            | Shared clinical rule structures     | Common risk and routing-result types used by multiple tools.                                                      | Technical Lead                                   |
| `clinical-rules/epds/`              | EPDS clinical behavior              | Contains EPDS routing rules, approved messages, and rule versions.                                                | Clinical Representative / Technical Lead         |
| `clinical-rules/phq2/`              | Future PHQ-2 rules                  | Reserved for MVP2.                                                                                                | Clinical Representative                          |
| `clinical-rules/pcl/`               | Future PCL rules                    | Reserved for MVP2.                                                                                                | Clinical Representative                          |
| `clinical-rules/dast/`              | Future DAST rules                   | Reserved for MVP2.                                                                                                | Clinical Representative                          |


---
 ### 4.4.6 Intergration Targets and API Contracts

 | Folder                    | Purpose                               | Details                                                                               | Primary Owner                               |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `backend/src/shared/`     | Backend-only reusable code            | Contains reusable errors, helpers, constants, and types not shared with frontend.     | Backend Developer                           |
| `shared/errors/`          | Typed backend errors                  | Standardizes validation, authentication, conflict, integration, and not-found errors. | Backend Developer                           |
| `shared/utils/`           | Backend utilities                     | General backend helpers not tied to one module.                                       | Backend Developer                           |
| `shared/constants/`       | Backend constants                     | Job types, system status values, retry defaults, and internal constants.              | Backend Developer                           |
| `shared/types/`           | Backend-only types                    | Internal types not exposed through API contracts.                                     | Backend Developer                           |
| `backend/migrations/`     | PostgreSQL schema changes             | Stores ordered, reversible database migrations.                                       | Backend Developer                           |
| `backend/seeds/`          | Initial development and facility data | Contains seed content required to initialize environments.                            | Backend Developer                           |
| `seeds/facilities/`       | Facility seed data                    | Hospital identity and facility settings.                                              | Backend Developer / PM                      |
| `seeds/rooms/`            | Room seed data                        | Counselling rooms and status.                                                         | Backend Developer / Clinical Operations     |
| `seeds/psychologists/`    | Psychologist seed data                | Initial psychologist accounts or profiles for development and staging.                | Backend Developer                           |
| `seeds/configuration/`    | Operational configuration             | Business hours, queue duration, feature flags, and system defaults.                   | Backend Developer                           |
| `seeds/assessment-tools/` | Screening-tool configuration          | EPDS for MVP1 and future tool metadata for MVP2 when enabled.                         | Backend Developer / Clinical Representative |
| `seeds/media/`            | Media metadata                        | References to approved audio, avatar, and video assets.                               | Backend Developer / UI-UX                   |
| `backend/tests/`          | Backend testing                       | Contains unit, integration, API, and external-contract tests.                         | Backend Developer / QA Engineer             |
| `tests/unit/`             | Unit tests                            | Tests individual backend functions and services.                                      | Backend Developer                           |
| `tests/integration/`      | Database and module tests             | Tests modules with PostgreSQL and internal dependencies.                              | Backend Developer / QA Engineer             |
| `tests/api/`              | Endpoint tests                        | Tests routes, validation, auth, status codes, and responses.                          | QA Engineer / Backend Developer             |
| `tests/contract/`         | External contract tests               | Verifies WEMA’s assumptions about Wonder and notification-provider contracts.         | Backend Developer / Wonder Technical Team   |


---
### 4.4.7 Content and Translation Structure

| Folder                               | Purpose                      | Details                                                                  | Primary Owner                                |
| ------------------------------------ | ---------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| `content/`                           | Approved non-code content    | Separates all language and media content from application logic.         | UI/UX Designer / Clinical Representative     |
| `content/translations/`              | Application text by language | Contains all user-visible text in English, Kiswahili, and Luo.           | UI/UX / Language Reviewer                    |
| `translations/en/`                   | English content              | Contains approved English labels, messages, questions, and instructions. | Clinical Representative / UI-UX              |
| `translations/sw/`                   | Kiswahili content            | Contains clinically reviewed Kiswahili translations.                     | Kiswahili Reviewer / Clinical Representative |
| `translations/luo/`                  | Luo content                  | Contains clinically reviewed Luo translations.                           | Luo Reviewer / Clinical Representative       |
| `translations/*/common.json`         | Shared application wording   | Common navigation, errors, actions, and labels.                          | UI/UX / Language Reviewer                    |
| `translations/*/consent.json`        | Consent text                 | Approved consent wording for each language.                              | Clinical Representative / Data Protection    |
| `translations/*/screening/`          | Screening-tool text          | Contains tool-specific question and instruction text.                    | Clinical Representative / Language Reviewer  |
| `translations/*/screening/epds.json` | EPDS text                    | Approved EPDS text for MVP1.                                             | Clinical Representative                      |
| `translations/*/screening/phq2.json` | Future PHQ-2 text            | Reserved for MVP2.                                                       | Clinical Representative                      |
| `translations/*/screening/pcl.json`  | Future PCL text              | Reserved for MVP2.                                                       | Clinical Representative                      |
| `translations/*/screening/dast.json` | Future DAST text             | Reserved for MVP2.                                                       | Clinical Representative                      |
| `translations/*/results.json`        | Result-screen wording        | Contains normal, elevated, and high-risk result messages.                | Clinical Representative                      |
| `translations/*/routing.json`        | Routing wording              | Contains room, queue, wait-time, and psychologist instructions.          | Clinical Representative / UI-UX              |


---
### 4.4.8 Audio, Avatar, Video, and Clinical Messages

| Folder                          | Purpose                        | Details                                                                                        | Primary Owner                               |
| ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `content/audio/`                | Offline audio narration        | Stores approved narration files organized by language and workflow.                            | UI/UX / Content Team                        |
| `audio/*/consent/`              | Consent narration              | Spoken consent content.                                                                        | Content Team / Clinical Representative      |
| `audio/*/screening/`            | Screening narration            | Contains tool-specific question audio.                                                         | Content Team                                |
| `audio/*/screening/epds/`       | EPDS narration                 | EPDS question and instruction audio for MVP1.                                                  | Content Team                                |
| `audio/*/screening/phq2/`       | Future PHQ-2 audio             | Reserved for MVP2.                                                                             | Content Team                                |
| `audio/*/screening/pcl/`        | Future PCL audio               | Reserved for MVP2.                                                                             | Content Team                                |
| `audio/*/screening/dast/`       | Future DAST audio              | Reserved for MVP2.                                                                             | Content Team                                |
| `audio/*/results/`              | Result narration               | Audio versions of approved result messages.                                                    | Content Team / Clinical Representative      |
| `audio/*/routing/`              | Routing narration              | Audio directions for room assignment, queue, and waiting.                                      | Content Team                                |
| `content/avatar/`               | Avatar content and assets      | Stores avatar visuals, animations, and approved scripts.                                       | UI/UX Designer / Frontend Developer         |
| `avatar/assets/`                | Avatar graphical assets        | Models, images, sprites, or approved character assets.                                         | UI/UX Designer                              |
| `avatar/animations/`            | Avatar movement assets         | Animation definitions and sequences.                                                           | UI/UX / Frontend Developer                  |
| `avatar/scripts/`               | Avatar dialogue scripts        | Approved scripts organized by language and screening tool.                                     | Clinical Representative / Language Reviewer |
| `avatar/manifest.json`          | Avatar manifest                | Lists available assets, scripts, versions, and compatibility information.                      | Frontend Developer                          |
| `content/video/`                | Psychoeducation videos         | Stores approved videos by language for offline playback.                                       | Clinical Representative / UI-UX             |
| `content/clinical-messages/`    | Tool-specific clinical wording | Stores clinically approved result, risk, and routing messages separately from general UI text. | Clinical Representative                     |
| `clinical-messages/*/epds.json` | EPDS clinical messages         | Approved MVP1 interpretation and routing wording.                                              | Clinical Representative                     |
| `clinical-messages/*/phq2.json` | Future PHQ-2 messages          | Reserved for MVP2.                                                                             | Clinical Representative                     |
| `clinical-messages/*/pcl.json`  | Future PCL messages            | Reserved for MVP2.                                                                             | Clinical Representative                     |
| `clinical-messages/*/dast.json` | Future DAST messages           | Reserved for MVP2.                                                                             | Clinical Representative                     |
---

### 4.4.9 Content Manifests

| Folder                          | Purpose                        | Details                                                                                        | Primary Owner                               |
| ------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `content/audio/`                | Offline audio narration        | Stores approved narration files organized by language and workflow.                            | UI/UX / Content Team                        |
| `audio/*/consent/`              | Consent narration              | Spoken consent content.                                                                        | Content Team / Clinical Representative      |
| `audio/*/screening/`            | Screening narration            | Contains tool-specific question audio.                                                         | Content Team                                |
| `audio/*/screening/epds/`       | EPDS narration                 | EPDS question and instruction audio for MVP1.                                                  | Content Team                                |
| `audio/*/screening/phq2/`       | Future PHQ-2 audio             | Reserved for MVP2.                                                                             | Content Team                                |
| `audio/*/screening/pcl/`        | Future PCL audio               | Reserved for MVP2.                                                                             | Content Team                                |
| `audio/*/screening/dast/`       | Future DAST audio              | Reserved for MVP2.                                                                             | Content Team                                |
| `audio/*/results/`              | Result narration               | Audio versions of approved result messages.                                                    | Content Team / Clinical Representative      |
| `audio/*/routing/`              | Routing narration              | Audio directions for room assignment, queue, and waiting.                                      | Content Team                                |
| `content/avatar/`               | Avatar content and assets      | Stores avatar visuals, animations, and approved scripts.                                       | UI/UX Designer / Frontend Developer         |
| `avatar/assets/`                | Avatar graphical assets        | Models, images, sprites, or approved character assets.                                         | UI/UX Designer                              |
| `avatar/animations/`            | Avatar movement assets         | Animation definitions and sequences.                                                           | UI/UX / Frontend Developer                  |
| `avatar/scripts/`               | Avatar dialogue scripts        | Approved scripts organized by language and screening tool.                                     | Clinical Representative / Language Reviewer |
| `avatar/manifest.json`          | Avatar manifest                | Lists available assets, scripts, versions, and compatibility information.                      | Frontend Developer                          |
| `content/video/`                | Psychoeducation videos         | Stores approved videos by language for offline playback.                                       | Clinical Representative / UI-UX             |
| `content/clinical-messages/`    | Tool-specific clinical wording | Stores clinically approved result, risk, and routing messages separately from general UI text. | Clinical Representative                     |
| `clinical-messages/*/epds.json` | EPDS clinical messages         | Approved MVP1 interpretation and routing wording.                                              | Clinical Representative                     |
| `clinical-messages/*/phq2.json` | Future PHQ-2 messages          | Reserved for MVP2.                                                                             | Clinical Representative                     |
| `clinical-messages/*/pcl.json`  | Future PCL messages            | Reserved for MVP2.                                                                             | Clinical Representative                     |
| `clinical-messages/*/dast.json` | Future DAST messages           | Reserved for MVP2.                                                                             | Clinical Representative                     |
---
### 4.5 Infrastructure

| Folder / File                | Purpose                              | Details                                                                                     | Primary Owner                            |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `infrastructure/`            | Operational infrastructure           | Contains container, deployment, monitoring, backup, and security configuration.             | QA / DevOps Engineer                     |
| `infrastructure/docker/`     | Container build files                | Contains shared Docker configuration not stored directly inside an application folder.      | QA / DevOps Engineer                     |
| `frontend.Dockerfile`        | Frontend production build            | Builds React applications and serves static output using Nginx or equivalent.               | QA / DevOps Engineer                     |
| `worker.Dockerfile`          | Background-worker image              | Builds the standalone worker process.                                                       | QA / DevOps Engineer / Backend Developer |
| `nginx.conf`                 | Frontend web-server config           | Configures static hosting, caching, compression, security headers, and SPA routing.         | QA / DevOps Engineer                     |
| `infrastructure/deployment/` | Environment deployment configuration | Separates development, staging, and production deployment settings.                         | QA / DevOps Engineer                     |
| `deployment/development/`    | Shared development environment       | Contains configuration for the team development environment.                                | QA / DevOps Engineer                     |
| `deployment/staging/`        | Staging environment                  | Contains pre-production deployment configuration using test data and Wonder sandbox.        | QA / DevOps Engineer                     |
| `deployment/production/`     | Production environment               | Contains production deployment configuration and hardened settings.                         | QA / DevOps Engineer                     |
| `infrastructure/monitoring/` | Monitoring and alerting              | Contains dashboards, alerts, and Sentry configuration.                                      | QA / DevOps Engineer                     |
| `monitoring/dashboards/`     | Operational dashboards               | Defines views for API health, sync failures, worker jobs, database, and Wonder integration. | QA / DevOps Engineer                     |
| `monitoring/alerts/`         | Alert rules                          | Defines notification rules for outages, failed jobs, high error rates, or backup failures.  | QA / DevOps Engineer                     |
| `monitoring/sentry/`         | Error-monitoring configuration       | Contains Sentry environment and release setup.                                              | QA / DevOps Engineer                     |
| `infrastructure/backups/`    | Backup and restoration               | Contains backup, restore, and restore-test procedures.                                      | QA / DevOps Engineer                     |
| `backups/backup-script/`     | Backup automation                    | Creates secure PostgreSQL backups.                                                          | QA / DevOps Engineer                     |
| `backups/restore-script/`    | Restore automation                   | Restores backups during testing or recovery.                                                | QA / DevOps Engineer                     |
| `backups/restore-test/`      | Restore validation                   | Verifies that backups are actually recoverable.                                             | QA / DevOps Engineer                     |
| `infrastructure/security/`   | Security infrastructure              | Contains policies and non-secret templates for secrets management and secure deployment.    | QA / DevOps / Technical Lead             |
| `security/secrets/`          | Secrets-management definitions       | Contains templates or references only, never real secrets.                                  | QA / DevOps Engineer                     |
| `security/policies/`         | Security policies                    | Documents deployment security, access control, log retention, and backup rules.             | Technical Lead / QA-DevOps               |


---

### 4.5.1 Documentation

| Folder / File               | Purpose                       | Details                                                                                     | Primary Owner                    |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------- |
| `docs/`                     | Project knowledge base        | Contains the documentation required to build, operate, test, and maintain WEMA.             | Project Manager / Technical Lead |
| `docs/architecture/`        | Architecture documentation    | Stores system design, implementation roadmap, diagrams, and architecture decisions.         | Technical Lead / Project Manager |
| `technical-design.md`       | Technical design document     | Describes the complete WEMA system architecture.                                            | Technical Lead                   |
| `implementation-roadmap.md` | Implementation plan           | Defines phases, responsibilities, dependencies, and acceptance criteria.                    | Project Manager / Technical Lead |
| `architecture/decisions/`   | Architecture Decision Records | Stores documented decisions, alternatives, rationale, and consequences.                     | Technical Lead                   |
| `docs/api/`                 | API documentation             | Contains endpoint references, request/response examples, authentication, and error formats. | Backend Developer                |
| `docs/database/`            | Database documentation        | Contains ER diagrams, table descriptions, migration rules, and ownership definitions.       | Backend Developer                |
| `docs/clinical/`            | Clinical documentation        | Contains approved scoring, messages, workflows, and clinical validation records.            | Clinical Representative          |
| `docs/clinical/mvp1/`       | MVP1 clinical material        | Contains EPDS rules and approved workflow.                                                  | Clinical Representative          |
| `docs/clinical/mvp2/`       | MVP2 clinical material        | Reserved for PHQ-2, PCL, DAST, scheduling, and general-public workflow.                     | Clinical Representative          |
| `docs/testing/`             | Testing documentation         | Contains test strategy, cases, traceability, evidence, and release sign-off.                | QA Engineer                      |
| `docs/deployment/`          | Deployment documentation      | Contains environment setup, release, rollback, and go-live instructions.                    | QA / DevOps Engineer             |
| `docs/security/`            | Security documentation        | Contains privacy, RBAC, secrets, device, logging, and incident requirements.                | Technical Lead / QA-DevOps       |
| `docs/runbooks/`            | Operational recovery guides   | Provides step-by-step instructions for common incidents.                                    | QA / DevOps / Backend Developer  |
| `sync-failure.md`           | Sync recovery runbook         | Explains how to diagnose and recover failed synchronization.                                | Backend Developer / QA-DevOps    |
| `wonder-outage.md`          | Wonder outage runbook         | Explains operation during Wonder downtime and later reconciliation.                         | Backend Developer / Wonder Team  |
| `whatsapp-failure.md`       | Alert failure runbook         | Explains retry, escalation, and manual response if WhatsApp fails.                          | Backend Developer / PM           |
| `tablet-replacement.md`     | Tablet recovery runbook       | Explains safe replacement, local-data recovery, and re-registration.                        | QA-DevOps / Hospital ICT         |
| `rollback.md`               | Deployment rollback runbook   | Explains how to return to the previous production release.                                  | QA / DevOps Engineer             |
---
### 4.5.2 Scripts and Github Automation

| Folder / File              | Purpose                          | Details                                                                                                      | Primary Owner                  |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `scripts/setup/`           | Developer setup                  | Automates installation, environment checks, and initial configuration.                                       | QA / DevOps Engineer           |
| `scripts/database/`        | Database operations              | Runs migrations, resets local databases, seeds data, and performs data checks.                               | Backend Developer              |
| `scripts/content/`         | Content validation and packaging | Validates translations, checks media manifests, calculates checksums, and prepares offline content packages. | Frontend Developer / QA-DevOps |
| `scripts/testing/`         | Test utilities                   | Creates test data, launches test environments, and runs specialized suites.                                  | QA Engineer                    |
| `scripts/maintenance/`     | Operational maintenance          | Contains approved repair, cleanup, and data-integrity scripts.                                               | Backend Developer / QA-DevOps  |
| `.github/workflows/`       | CI/CD workflows                  | Automates pull-request checks and deployments.                                                               | QA / DevOps Engineer           |
| `pull-request.yml`         | Pull-request validation          | Runs install, lint, type-check, test, build, and security checks.                                            | QA / DevOps Engineer           |
| `deploy-staging.yml`       | Staging deployment               | Builds and deploys a release candidate to staging.                                                           | QA / DevOps Engineer           |
| `deploy-production.yml`    | Production deployment            | Promotes an approved artifact to production with required gates.                                             | QA / DevOps Engineer           |
| `.github/ISSUE_TEMPLATE/`  | Issue templates                  | Standardizes bug, feature, technical debt, and spike issue creation.                                         | Project Manager / QA Lead      |
| `PULL_REQUEST_TEMPLATE.md` | Pull-request checklist           | Requires description, test evidence, risk notes, screenshots, and documentation updates.                     | Technical Lead / QA Lead       |


---

## 5. Implementation Phases

Each phase below includes objective, rationale, activities, technical decisions, deliverables, dependencies, risks, acceptance criteria, responsible roles, and the sprint/milestone grouping. Phases are ordered for execution; a phase's acceptance criteria must be met before the next phase formally begins, though limited overlap (e.g., DevOps setup running alongside Phase 1) is expected and healthy.

---



### Phase 1 — Environment, Repository & CI/CD Foundation

**Objective:** Stand up the monorepo, local dev environment, Docker Compose stack, and a minimal CI pipeline so every subsequent phase has a working, testable foundation.

**Why required:** Establishing the environment first (rather than mid-project) prevents environment drift and lets every engineer contribute from day one with an identical setup.

**Activities:**
- Scaffold the monorepo.
- Configure Docker Compose for Postgres + backend + workers.
- Set up base TypeScript/ESLint/Prettier configs in `packages/config`.
- Configure CI pipeline: lint → typecheck → unit test → build, on every PR.
- Configure `.env.example` and secrets-management approach (local `.env`, staging/production via secrets manager).
- Set up initial health-check endpoints (`/health`).

**Technical decisions:**
- Package manager for workspaces (npm/yarn/pnpm workspaces).
- Migration tool for PostgreSQL (e.g., a TypeScript-friendly migration runner).
- Logging conventions (Pino log levels, redaction rules) established now so they're used consistently from the first backend line of code.

**Expected outputs/deliverables:**
- Working `docker-compose up` that brings up Postgres, backend, and workers locally.
- Green CI pipeline on an empty/skeleton codebase.
- README with onboarding steps a new developer can follow in under 30 minutes.


**Risks & mitigation:**
- *Risk:* Over-engineering the CI/CD pipeline before there's code to test. *Mitigation:* Keep it minimal (lint/typecheck/build) and expand test stages as code lands.

**Acceptance criteria:**
- A new developer can clone the repo, run one setup command, and have the full stack running locally.
- CI blocks merges on lint/typecheck failures.

**Responsible:** DevOps Engineer (leads), Software Architect, Backend Engineer.

**Milestone grouping:** Sprint 1.

**Gate to next phase:** Local dev environment reproducible by all engineers; CI green on skeleton.

---

### Phase 2 — Data Model & Core Backend Foundations

**Objective:** Design and migrate the core PostgreSQL schema, and build the foundational backend services (auth, audit logging) that every later feature depends on.

**Why required:** Screening sessions, assessments, routing, and sync all depend on a stable, correctly-relational schema. Getting this right early avoids painful migrations later, especially since MVP2's tools must fit the same schema without a migration (per the roadmap note in the source documentation).

**Activities:**
- Design and migrate core entities (see Section 6.2): `users`, `roles`, `psychologists`, `patients`, `screening_sessions`, `assessments`, `assessment_answers`, `routing_decisions`, `psychologist_availability`, `rooms`, `room_assignments`, `queues`, `queue_entries`, `counselling_sessions`, `alerts`, `notifications`, `appointments`, `sync_transactions`, `integration_events`, `audit_logs`.
- Build JWT-based authentication and RBAC middleware for internal portals.
- Build the audit-logging service (every clinically significant write is audited).
- Seed data scripts for local/staging development.

**Technical decisions:**
- Schema design allows `assessment_answers` to be tool-agnostic (question ID + value pairs) so PHQ-2/PCL/DAST (MVP2) can reuse the same tables without migration — this is the concrete mechanism behind "no schema migration for additional tools."
- Decide on soft-delete vs. hard-delete policy for clinical records (recommend soft-delete with retention rules — see Section 8).
- Decide on UUID vs. sequential IDs for patient-facing records (recommend UUID to avoid enumeration/leakage risk).

**Expected outputs/deliverables:**
- Migrated PostgreSQL schema with seed data.
- Working auth endpoints (login, token refresh) for the psychologist portal.
- Audit log writer integrated into a sample write path.
- ER diagram of the schema (documented in `docs/architecture`).

**Dependencies:** Phase 1 environment.

**Risks & mitigation:**
- *Risk:* Schema designed too EPDS-specific, creating migration debt for MVP2. *Mitigation:* Explicit schema review with Software Architect and Healthcare Systems Architect before migrating, checked against MVP2's PHQ-2/PCL/DAST data shape.

**Acceptance criteria:**
- Schema reviewed and approved by Software Architect and Healthcare Systems Architect for MVP2 forward-compatibility.
- Auth + RBAC functional against seeded users with distinct roles.
- Every write to `assessments`, `routing_decisions`, and `counselling_sessions` produces a corresponding `audit_logs` entry.

**Responsible:** Backend Engineer (leads), Software Architect, Healthcare Systems Architect (schema review).

**Milestone grouping:** Sprint 2.

**Gate to next phase:** Schema approved; auth/RBAC functional; audit logging proven on at least one write path.

---

### Phase 3 — Offline-First Frontend Foundation

**Objective:** Build the patient-app shell: language selection, consent, offline storage (Dexie/IndexedDB), and the service-worker caching strategy — before building the EPDS screening itself.

**Why required:** Offline-first is a hard architectural constraint, not an add-on. Getting the local-storage and service-worker foundation right first means the EPDS screen (Phase 4) is built directly against a working offline substrate rather than retrofitted.

**Activities:**
- Design Dexie.js schema (local tables: cached patients, draft assessments, outbox, config cache, video/audio asset references).
- Implement Workbox service worker: pre-cache app shell, screening assets, videos/audio.
- Build language selection and consent screens per existing UI/UX designs — **design review and technical validation only**, not redesign.
- Build the local outbox pattern: writes go to IndexedDB first, then a background sync process attempts delivery when online.
- Implement sync-status UI (synced / pending / failed) so patients and staff always know the state of a record.

**Technical decisions:**
- Outbox retry strategy (exponential backoff, max retry visibility to staff rather than silent failure).
- What gets pre-cached at first load vs. lazily (large video assets likely lazy-cached per language to control tablet storage use).

**Expected outputs/deliverables:**
- Functional offline app shell: works fully with network disabled after first load.
- Dexie schema documented.
- Sync-status indicator component reusable across screens.

**Dependencies:** Phase 1 environment; existing UI/UX designs available for validation.

**Risks & mitigation:**
- *Risk:* Tablet storage limits exceeded by cached video/audio in all three languages. *Mitigation:* Lazy-load non-selected-language media; measure actual asset sizes early and set a storage budget.
- *Risk:* Silent sync failures leave clinically important data stuck locally. *Mitigation:* Sync-status UI must surface failed syncs prominently to staff, not just patients (see Section 8 — "failed-sync visibility").

**Acceptance criteria:**
- App is fully navigable through language/consent with network disabled.
- A record written offline is confirmed to sync automatically once connectivity returns, without user action.
- Failed syncs are visibly flagged in the UI, not hidden.

**Responsible:** Frontend Engineer (leads), UI/UX Designer (validation, not redesign), QA Engineer (offline test scenarios begin here).

**Milestone grouping:** Sprint 3.

**Gate to next phase:** Offline app shell demonstrably functional with airplane-mode testing; outbox sync proven end-to-end against a stub backend endpoint.

---

### Phase 4 — EPDS Screening Tool & Local Scoring Engine

**Objective:** Implement the EPDS questionnaire (Q1–5, Q6–10), the pure scoring/risk-classification engine, and the patient-search/fallback-registration flow.

**Why required:** This is the clinical core of MVP1. It must be built as a pure, independently-testable module (`packages/scoring-engine`) so scoring logic can be clinically validated in isolation from UI concerns.

**Activities:**
- Implement `packages/scoring-engine`: pure functions taking EPDS answers, returning score + risk classification (Green/Yellow/Red), with no framework dependency.
- Implement patient search against the locally synced Wonder queue (read from IndexedDB).
- Implement fallback manual registration (First Name, Middle Name, Last Name, Phone Number, National ID Number) — must never block screening, per the hard architectural constraint in the source documentation.
- Wire the EPDS screen to the scoring engine and local outbox.
- Implement results display: self-care message (Green) vs. clinical routing trigger (Yellow/Red).

**Technical decisions:**
- Scoring engine takes a versioned rule-set input so future EPDS scoring guideline changes don't require a code rewrite, only a new rule-set version — supporting audit traceability of "which rules produced this classification."
- Fallback registration writes locally immediately and is queued for `SYNC_MANUAL_PATIENT`; it is never blocked on Wonder lookup succeeding.

**Expected outputs/deliverables:**
- `scoring-engine` package with 100% branch coverage on classification logic.
- Working EPDS flow: search/register → answer 10 questions → score → classify → display result.
- Clinical wording of results reviewed by the clinical representative.

**Dependencies:** Phase 2 schema (for eventual sync target shape), Phase 3 offline foundation.

**Risks & mitigation:**
- *Risk:* Incorrect EPDS scoring is a direct clinical-safety issue. *Mitigation:* Scoring engine is unit-tested against published EPDS reference score tables and independently reviewed by the clinical representative before merge.
- *Risk:* Fallback registration accidentally introduces a blocking dependency on network availability. *Mitigation:* Explicit offline test case: complete a full fallback-registration-to-EPDS-result flow with network disabled from the start.

**Acceptance criteria:**
- Scoring engine outputs match a clinically-approved reference score table for all tested answer combinations.
- Fallback registration → screening completes successfully with no network connection at any point.
- Clinical representative signs off on result wording (self-care message, risk classification language).

**Responsible:** Frontend Engineer + Backend Engineer (scoring-engine is shared), Healthcare Systems Architect, Clinical representative, QA Engineer.

**Milestone grouping:** Sprint 4.

**Gate to next phase:** Clinical sign-off on scoring accuracy and wording obtained; offline fallback-to-result flow passes QA.

---

### Phase 5 — Routing, Availability, Room Allocation & Queue

**Objective:** Implement the local logic that, upon a high-risk result, checks psychologist/room availability and routes the patient — including the waiting-queue and psychoeducation-video fallback.

**Why required:** This is the second clinical-safety-critical piece: a high-risk patient must never be "lost" between screening and either a room assignment or a queue placement.

**Activities:**
- Implement the local resource cache (synced psychologist/room availability, per `GET /sync/psychologists`, `GET /sync/rooms`).
- Implement the routing decision: available → display room/counsellor + trigger WhatsApp alert request; unavailable → play psychoeducation video, place in local queue (Red ahead of Yellow).
- Implement queue-position and estimated-wait-time display.
- Implement automatic room assignment once availability changes (backend-synced update reflected in local queue).
- Implement the backend-side availability, queue, and room-allocation services (Section 6) that the tablet syncs against.

**Technical decisions:**
- Queue ordering algorithm: strict Red-before-Yellow, then FIFO within risk tier — documented explicitly so QA can write deterministic test cases.
- Whether room/availability sync interval is push (webhook-like, when online) or poll-based on a fixed cadence — recommend short-interval polling for MVP1 simplicity, with a note that push-based sync is a reasonable post-launch optimization.

**Expected outputs/deliverables:**
- Working routing decision logic proven against all four permutations: (Red/Yellow) × (room available/unavailable).
- Backend availability, queue, and room-allocation services with corresponding API endpoints (Section 6).
- Queue UI showing position and estimated wait.

**Dependencies:** Phase 2 schema, Phase 4 scoring/classification output.

**Risks & mitigation:**
- *Risk:* Race condition where two high-risk patients are simultaneously assigned the same room. *Mitigation:* Room assignment is transactional at the backend; the tablet's local assignment is provisional and reconciled on next sync, with conflict-handling rules defined (Section 6.1) and explicitly tested (Section 7).
- *Risk:* A high-risk patient's routing state is lost on tablet crash/restart mid-queue. *Mitigation:* Queue state persisted in IndexedDB, recovery test included in QA (Section 7 — device restart recovery).

**Acceptance criteria:**
- All four routing permutations produce correct, clinically-reviewed behavior.
- Simulated device restart mid-queue recovers the patient's correct queue position without duplication or loss.
- Room-assignment conflicts (two simultaneous high-risk patients, one room) resolve deterministically and are logged.

**Responsible:** Backend Engineer (leads availability/queue/room services), Frontend Engineer (queue UI), Healthcare Systems Architect, QA Engineer.

**Milestone grouping:** Sprint 5.

**Gate to next phase:** No high-risk patient can be "lost" in any tested scenario (crash, conflict, offline); clinical sign-off on queue fairness rules.

---

### Phase 6 — Alerts, Notifications & Wonder Sync (No-CHP End-of-Day Flow)

**Objective:** Implement the WhatsApp red-alert dispatch, the backend sync/outbox engine, the Wonder adapter, and the updated no-CHP end-of-day flow.

**Why required:** This phase implements the architecture change directly: WEMA no longer generates CHP tasks; it stores, syncs, and pushes to Wonder, and Wonder takes it from there.

**Activities:**
- Implement `REQUEST_WHATSAPP_ALERT` (local job) and `SEND_WHATSAPP_ALERT` (backend job), carrying Patient ID, Name, Score, Hospital, Time, and Assigned Room.
- Implement the sync engine: `SYNC_MANUAL_PATIENT`, `SYNC_ASSESSMENT`, `SYNC_CONSULTATION_ASSIGNMENT`, `SYNC_AUDIT_EVENT` as local jobs; `UPDATE_WONDER`, `WRITE_AUDIT_LOG`, `PROCESS_NOTIFICATION` as backend jobs.
- Implement the Wonder adapter: maps WEMA's assessment/outcome shape to Wonder's expected patient-record update format.
- Implement the tablet sync endpoints exactly as specified: downloads (`/sync/patients`, `/sync/config`, `/sync/psychologists`, `/sync/rooms`, `/sync/business-hours`, `/sync/videos`) and uploads (`/sync/manual-registrations`, `/sync/assessments`, `/sync/consultation-assignments`, `/sync/notification-requests`, `/sync/audit-events`).
- Implement idempotency keys on all upload endpoints to prevent duplicate submission on retry.
- Explicitly confirm the removed jobs (`ASSIGN_CHP`, `SEND_SMS`, `CREATE_CHP_FOLLOWUP`) have **no** code paths, UI affordances, or database tables in this build.
- Implement the end-of-business escalation as a pure "did this patient get reviewed before close?" check that, if unreviewed, does nothing more than ensure the assessment is stored and queued for sync — no CHP task, no SMS origination from WEMA.

**Technical decisions:**
- Idempotency strategy: client-generated UUID per sync payload, backend deduplicates on that key.
- Conflict handling for `SYNC_CONSULTATION_ASSIGNMENT` if the same patient was assigned by two tablets before either synced (rare but possible in a multi-tablet facility) — resolve via last-write-wins on a server timestamp, with a full audit trail of the losing write for manual review.

**Expected outputs/deliverables:**
- Working WhatsApp alert dispatch, queued when offline, delivered once online.
- Working end-to-end sync: tablet → backend → Wonder, verified against the Wonder sandbox.
- Documented Wonder adapter contract in `docs/api`.
- Confirmation checklist showing the three removed jobs are absent from the codebase (a simple grep-based CI check is a reasonable enforcement mechanism).

**Dependencies:** Phase 2 backend foundations, Phase 5 routing output, Wonder sandbox access (Phase 0).

**Risks & mitigation:**
- *Risk:* Wonder sandbox unavailable or its contract differs from documentation. *Mitigation:* Wonder adapter built against an interface/mock first, so the rest of the backend is not blocked; integration testing against the real sandbox happens as soon as access is available, before production sign-off.
- *Risk:* Duplicate assessment submissions to Wonder from retried syncs. *Mitigation:* Idempotency keys enforced and explicitly tested (Section 7 — retry/conflict testing).
- *Risk:* A leftover CHP code path accidentally ships. *Mitigation:* CI check plus explicit QA test case confirming no SMS/CHP task is ever generated by WEMA under any end-of-day scenario.

**Acceptance criteria:**
- A high-risk assessment, created offline, results in a correctly formatted Wonder update once connectivity returns, with no duplication on repeated sync attempts.
- WhatsApp alert delivered with all required fields (Patient ID, Name, Score, Hospital, Time, Assigned Room).
- Zero CHP/SMS-origination code paths present, confirmed via automated check and manual QA.

**Responsible:** Backend Engineer (leads), Wonder technical team (contract validation), DevOps Engineer (queue/worker infra), QA Engineer.

**Milestone grouping:** Sprint 6.

**Gate to next phase:** Wonder sandbox integration test passes; no-CHP confirmation checklist signed off; alert delivery verified.

---

### Phase 7 — Psychologist Portal

**Objective:** Design and build the psychologist-facing portal — the primary outstanding UI/UX work identified in scope.

**Why required:** Unlike the patient app, this interface does not yet exist and requires both design and implementation.

**Activities:**
- Design (UI/UX Designer, with clinical input): login, availability status toggle (available/busy/offline/unavailable), queue view, high-risk alert view, session start/complete, dashboard, audit history view.
- Implement secure login (JWT, RBAC) against Phase 2 auth foundations.
- Implement availability status management, feeding the Phase 5 routing/availability service.
- Implement queue viewing with real-time-ish refresh (poll-based for MVP1).
- Implement session start/completion, writing to `counselling_sessions` and closing out `routing_decisions`.
- Implement basic dashboard and audit history views (detailed reporting can extend post-launch, but the data model must support it from Phase 2).

**Technical decisions:**
- Refresh strategy for the queue view (short-interval polling for MVP1; consider WebSocket/push as a post-launch enhancement, not a Phase 7 requirement).
- Session-timeout policy for psychologist logins (see Section 8).

**Expected outputs/deliverables:**
- Functional psychologist portal covering all listed screens.
- Clinical review of portal wording and workflow (does the "start session" → "complete session" flow match real clinical practice?).

**Dependencies:** Phase 2 auth/RBAC, Phase 5 availability/queue services.

**Risks & mitigation:**
- *Risk:* Portal design underestimates real clinical workflow needs (e.g., handover between shifts). *Mitigation:* Include the clinical representative in design review before implementation starts, not just after.

**Acceptance criteria:**
- A psychologist can log in, set availability, view the queue, start and complete a session, and see it reflected in the patient-app queue state on next sync.
- Clinical representative confirms the workflow matches real facility practice.

**Responsible:** UI/UX Designer (leads design), Frontend Engineer (leads implementation), Backend Engineer (supporting endpoints), Clinical representative.

**Milestone grouping:** Sprint 7.

**Gate to next phase:** End-to-end demonstration: patient screened high-risk on tablet → appears in psychologist queue → psychologist completes session → state reconciled across both apps.

---

### Phase 8 — Multilingual, Accessibility & Content Validation

**Objective:** Validate the existing patient-facing screens (not redesign them) for multilingual correctness, accessibility, and clinical wording, and finalize missing-state/offline/error-state designs.

**Why required:** The brief explicitly separates "design review and validation" from "redesign" — this phase is where that review happens systematically, ensuring nothing is missed before hardening.

**Activities:**
- Design review pass across all existing screens: identify missing states (empty search results, sync failure, video load failure).
- Validate Kiswahili and Luo translations against clinical accuracy (not just literal translation).
- Accessibility pass: font sizing, color contrast for risk indicators (Green/Yellow/Red must be distinguishable beyond color alone), touch-target sizing for a kiosk/tablet context.
- Finalize offline and error-state designs identified as missing.
- Finalize queue and waiting-state designs.
- Room/availability management interface review (part of the psychologist portal, cross-checked here for consistency).

**Technical decisions:**
- Establish a lightweight design-review checklist reusable for MVP2's additional screening tools.

**Expected outputs/deliverables:**
- Missing-state inventory with designs for each gap.
- Multilingual validation sign-off from a qualified reviewer per language.
- Accessibility checklist completed.

**Dependencies:** Phases 3–7 (all screens must exist to be reviewed).

**Risks & mitigation:**
- *Risk:* Translation review surfaces clinically significant wording issues late. *Mitigation:* Run this review in parallel with Phase 7, not strictly after, so there's runway to fix before hardening.

**Acceptance criteria:**
- Every screen has a defined design for its loading, empty, error, and offline states.
- Clinical + language reviewers sign off on all three languages.
- Accessibility checklist passed.

**Responsible:** UI/UX Designer (leads), Clinical representative, Frontend Engineer.

**Milestone grouping:** Sprint 7–8 (overlaps Phase 7).

**Gate to next phase:** No screen ships without a defined error/offline/empty state; language sign-off obtained.

---

### Phase 9 — Security, Privacy & Clinical Safety Hardening

**Objective:** Systematically implement and verify the security/privacy/clinical-safety requirements in Section 8 before entering formal QA.

**Why required:** This is a healthcare system handling sensitive patient data and mental-health risk classifications; hardening must be a deliberate phase, not an afterthought.

**Activities:**
- Enforce encryption in transit (TLS everywhere) and at rest where applicable (database-level encryption, encrypted local storage considerations for IndexedDB where feasible).
- Review token handling, session timeout, and device access controls for the tablet and portal.
- Verify audit logging covers all clinically significant actions with sensitive-data masking in logs.
- Verify secrets are never in source control; confirm secrets-manager usage end-to-end.
- Implement duplicate-submission prevention (builds on Phase 6 idempotency) and failed-sync visibility (builds on Phase 3 sync-status UI).
- Run a clinical-escalation-safety review specifically targeting "can a high-risk case ever be silently lost" across every code path touched in Phases 4–6.
- Document data ownership boundaries between WEMA and Wonder (Section 8).

**Technical decisions:**
- Data retention period for locally cached patient data on tablets (recommend confirming with hospital data-protection policy — flagged for stakeholder confirmation, see Section 8).

**Expected outputs/deliverables:**
- Security review report covering each item in Section 8.
- Clinical-escalation-safety review sign-off.
- Updated `docs/runbooks` covering incident scenarios (lost sync, Wonder outage, tablet loss).

**Dependencies:** All prior phases (this is a cross-cutting hardening pass).

**Risks & mitigation:**
- *Risk:* Hardening surfaces a design gap requiring rework. *Mitigation:* Budget schedule slack for this phase rather than treating it as a checkbox exercise; do not compress it under deadline pressure given the clinical-safety stakes.

**Acceptance criteria:**
- Every item in Section 8's checklist is either implemented and verified, or explicitly flagged with an owner and target resolution date.
- Clinical-escalation-safety review confirms no identified path where a high-risk result fails to reach either a room assignment, a queue entry, or a synced Wonder record.

**Responsible:** Software Architect + Backend Engineer (security implementation), Healthcare Systems Architect (clinical-safety review), DevOps Engineer (secrets/infra), QA Engineer.

**Milestone grouping:** Sprint 8.

**Gate to next phase:** Security and clinical-safety sign-off obtained from Software Architect, Healthcare Systems Architect, and — where applicable — hospital data-protection contact.

---

### Phase 10 — Full QA Cycle & Clinical/User Acceptance Testing

**Objective:** Execute the complete testing strategy (Section 7) against a staging environment that mirrors production, culminating in clinical and user acceptance sign-off.

**Why required:** This is the last gate before production deployment; it must be comprehensive given the clinical stakes, and it validates the system as a whole rather than component-by-component.

**Activities:**
- Execute the full test matrix from Section 7: unit, component, API, integration, E2E, offline, sync, retry, conflict, recovery, multilingual, audio/avatar/video, scoring validation, routing validation, availability/room/queue testing, Wonder integration testing, auth/authorization, security, performance/load.
- Run structured clinical acceptance testing with the clinical representative walking through real-world scenarios end-to-end.
- Run user acceptance testing with actual facility staff on the target tablet hardware.
- Triage and resolve all high/critical-severity bugs; document and consciously accept or defer lower-severity ones with sign-off.

**Technical decisions:**
- Release-blocking bug severity thresholds (recommend: any clinical-safety or data-loss bug is release-blocking regardless of severity classification elsewhere).

**Expected outputs/deliverables:**
- Completed test execution report against the Section 7 matrix.
- Clinical acceptance sign-off.
- User acceptance sign-off from facility staff representatives.
- Final bug triage log with resolutions or documented deferrals.

**Dependencies:** Phase 9 hardening complete; staging environment (Phase 11, run partially in parallel) available.

**Risks & mitigation:**
- *Risk:* Real tablet hardware behaves differently than dev machines (touch responsiveness, storage limits, battery/network conditions). *Mitigation:* UAT must happen on actual target hardware, not just browser dev tools' device emulation.

**Acceptance criteria:**
- All release-blocking bugs resolved.
- Clinical and user acceptance sign-offs obtained and filed.

**Responsible:** QA Lead (leads), Clinical representative, facility staff representatives, Backend/Frontend Engineers (bug fixes).

**Milestone grouping:** Sprint 9.

**Gate to next phase:** Clinical + UAT sign-off obtained; no open release-blocking bugs.

---

### Phase 11 — Staging & Production Environment Setup, Deployment

**Objective:** Finalize staging and production infrastructure, execute the deployment pipeline, and go live.

**Why required:** A distinct phase ensures deployment isn't rushed at the end and that rollback, monitoring, and backup procedures are proven before real patients depend on the system.

**Activities:**
- Finalize staging and production Docker images, environment variables, and secrets.
- Configure production PostgreSQL (managed service recommended), automated backups, and a proven restore procedure (actually test a restore, not just confirm backups run).
- Configure monitoring, error tracking (Sentry or equivalent), and centralized logging in production.
- Configure health checks and alerting thresholds.
- Execute a staged rollout: deploy to staging, smoke-test, deploy to production, smoke-test, monitor closely for an agreed hypercare window.
- Prepare and rehearse a rollback procedure.

**Technical decisions:**
- Deployment strategy (recommend blue-green or at minimum a tested rollback-to-previous-image procedure, given the clinical-safety stakes of a broken deploy).
- Hypercare window length and on-call ownership post-launch.

**Expected outputs/deliverables:**
- Live production environment.
- Verified backup/restore procedure.
- Monitoring dashboards and alerting configured and tested (trigger a test alert to confirm it reaches the right people).
- Rollback procedure documented and rehearsed at least once in staging.

**Dependencies:** Phase 10 QA/UAT sign-off.

**Risks & mitigation:**
- *Risk:* Production Wonder endpoint differs subtly from sandbox. *Mitigation:* A final, narrowly-scoped smoke test against production Wonder immediately post-deploy, before declaring go-live complete, with the Wonder technical team on standby.

**Acceptance criteria:**
- Production smoke tests pass, including a real (or tightly controlled test) end-to-end EPDS flow through to a real Wonder update.
- Backup/restore procedure verified.
- Rollback rehearsed successfully.

**Responsible:** DevOps Engineer (leads), Backend Engineer, Wonder technical team (production endpoint validation), Project Manager (go-live coordination).

**Milestone grouping:** Sprint 10 — Go-Live.

**Gate to next phase:** Successful go-live with passing smoke tests and no open release-blocking incidents during the hypercare window.

---

### Phase 12 — Handover & Post-Launch Support

**Objective:** Transition from active development to steady-state operation, with documentation and support processes in place.

**Why required:** A healthcare system cannot be left without a clear ownership and support model after the initial delivery team's engagement winds down.

**Activities:**
- Finalize all technical documentation (architecture, API reference, runbooks).
- Conduct a formal handover session covering system architecture, known issues/deferrals, and operational procedures.
- Establish the post-launch support plan: bug triage process, escalation path for clinical-safety incidents specifically, and a cadence for reviewing sync/error logs.
- Define the MVP2 entry criteria (referencing this document's schema forward-compatibility work) so General Public workflow development can begin without re-litigating MVP1 architecture decisions.

**Technical decisions:**
- Support-tier definitions (e.g., clinical-safety incident vs. standard bug) and response-time targets for each.

**Expected outputs/deliverables:**
- Completed documentation checklist (Section 10).
- Signed handover checklist.
- Documented post-launch support plan with named owners.

**Dependencies:** Phase 11 successful go-live.

**Risks & mitigation:**
- *Risk:* Knowledge concentrated in departing team members. *Mitigation:* Handover session recorded; runbooks written to be followable by someone who wasn't in the room.

**Acceptance criteria:**
- Documentation checklist complete.
- Support plan agreed and signed off by receiving operational team and hospital leadership.

**Responsible:** Project Manager (leads), Software Architect, DevOps Engineer, all engineering roles (documentation contributions).

**Milestone grouping:** Sprint 10–11 (post-launch).

**Gate to close-out:** Formal handover sign-off; MVP1 considered complete and in steady-state operation.

---

## 6. API & Database Planning

### 6.1 High-Level API Groups

| Group | Purpose | Auth | Primary consumers |
|---|---|---|---|
| Authentication | Login, token refresh, logout | Public (login), JWT (refresh) | Psychologist portal, admin |
| Users & Roles | Manage internal accounts and RBAC roles | JWT + admin role | Admin |
| Psychologists | Psychologist profile management | JWT | Portal, admin |
| Psychologist Availability | Set/get availability status | JWT (psychologist), service token (tablet sync) | Portal, tablet sync |
| Rooms | Room inventory management | JWT + admin role | Portal, admin |
| Queue Management | View/update queue entries | JWT, service token | Portal, tablet sync |
| Patient Lookup | Search synced Wonder patient list | Service token | Tablet sync |
| Patient Fallback Registration | Submit manually-registered patients | Service token | Tablet sync |
| Screening Sessions | Create/track a screening session | Service token | Tablet sync |
| Assessments | Submit completed assessments | Service token, idempotency key required | Tablet sync |
| Synchronization | Generic download/upload sync endpoints | Service token | Tablet sync |
| Alerts | WhatsApp alert dispatch requests | Service token (internal) | Backend jobs |
| Notifications | Notification status/history | JWT | Portal, admin |
| Scheduling | Session start/complete, appointment tracking | JWT (psychologist) | Portal |
| Reports | Aggregate/report data | JWT + admin/clinical role | Portal, admin |
| Wonder Integration | Adapter-facing internal endpoints (not public) | Internal service credentials | Wonder adapter only |
| Health Checks | Liveness/readiness | Public/internal | DevOps, monitoring |
| Audit Logs | Query audit trail | JWT + admin role | Portal, compliance review |

**Note on the tablet's "service token":** the patient tablet does not authenticate individual users; it authenticates as a trusted device against the facility's sync service, per the offline-first, no-per-user-login design implied by the source workflow documentation. This is distinct from the psychologist portal, which requires individual JWT-based login and RBAC.

### 6.2 Core Database Entities & Relationships

| Entity | Origin | Relationships |
|---|---|---|
| `users` | WEMA-owned | Has one `roles`; referenced by `psychologists` (1:1 where applicable) |
| `roles` | WEMA-owned | Referenced by `users` |
| `psychologists` | WEMA-owned | Has many `psychologist_availability`, `counselling_sessions`, `room_assignments` |
| `patients` | **Wonder-sourced** for matched patients; **WEMA-owned** for fallback-registered patients pending Wonder reconciliation | Has many `screening_sessions` |
| `screening_sessions` | WEMA-owned | Belongs to `patients`; has one `assessments` |
| `assessments` | WEMA-owned (pushed to Wonder, not owned by it) | Belongs to `screening_sessions`; has many `assessment_answers`; has one `routing_decisions` |
| `assessment_answers` | WEMA-owned | Belongs to `assessments`; tool-agnostic shape (question ID + value) to support MVP2 tools without migration |
| `routing_decisions` | WEMA-owned | Belongs to `assessments`; references `room_assignments` and/or `queue_entries` |
| `psychologist_availability` | WEMA-owned | Belongs to `psychologists` |
| `rooms` | WEMA-owned | Has many `room_assignments` |
| `room_assignments` | WEMA-owned | Belongs to `rooms`, `psychologists`, `routing_decisions` |
| `queues` | WEMA-owned | Has many `queue_entries` |
| `queue_entries` | WEMA-owned | Belongs to `queues`, `routing_decisions` |
| `counselling_sessions` | WEMA-owned | Belongs to `psychologists`, `routing_decisions` |
| `alerts` | WEMA-owned | Belongs to `routing_decisions` (typically the WhatsApp red-alert) |
| `notifications` | WEMA-owned | Generic notification records, may reference `alerts` |
| `appointments` | WEMA-owned | Used for scheduling (MVP2's Wednesday clinic; present in schema for forward-compat) |
| `sync_transactions` | WEMA-owned | Tracks each sync attempt, for retry/idempotency/debugging |
| `integration_events` | WEMA-owned | Records every Wonder push attempt and outcome — the audit trail for "did this reach Wonder" |
| `audit_logs` | WEMA-owned | Cross-cutting: references any clinically significant entity change |

**Wonder vs. WEMA data ownership, explicitly:**
- **Wonder owns:** the master patient identity record, and all community follow-up (CHP assignment, home visits, SMS) once an assessment outcome has been pushed.
- **WEMA owns:** the screening session, the assessment content and score, the routing/queue/room decision, and the audit trail of what happened inside WEMA. WEMA's `patients` table for Wonder-matched patients is a **local cache/reference**, not the source of truth — the source of truth remains Wonder.

---

## 7. Testing & Quality Assurance Strategy

### 7.1 Test Types and Scope

| Test type | Scope | Owner |
|---|---|---|
| Unit testing | Scoring engine, routing logic, individual backend services | Backend/Frontend Engineers |
| Component testing | React components (patient app + portal) via Vitest/RTL | Frontend Engineer |
| API testing | Every REST endpoint group in Section 6.1 | Backend Engineer, QA Engineer |
| Integration testing | Backend ↔ PostgreSQL, backend ↔ Wonder adapter | Backend Engineer, QA Engineer |
| End-to-end testing | Full patient flows and portal flows via Playwright | QA Engineer |
| Offline testing | Full flows with network disabled/intermittent | QA Engineer |
| Synchronization testing | Outbox delivery, download sync correctness | Backend Engineer, QA Engineer |
| Retry testing | Failed sync retried and eventually succeeds without duplication | QA Engineer |
| Conflict testing | Simultaneous room assignment, consultation assignment conflicts | Backend Engineer, QA Engineer |
| Interrupted-session recovery | App killed mid-screening, resumes correctly | QA Engineer |
| Browser refresh recovery | Refresh mid-flow does not lose in-progress data | QA Engineer |
| Device restart recovery | Full tablet restart mid-queue, state recovered | QA Engineer |
| Multilingual testing | All three languages, all screens | QA Engineer, Clinical/language reviewers |
| Audio testing | Narration playback per language, per question | QA Engineer |
| Avatar testing | Avatar animation triggers correctly with content | QA Engineer |
| Video playback testing | Psychoeducation videos load and play offline | QA Engineer |
| Scoring validation | EPDS output matches clinical reference tables | Clinical representative, QA Engineer |
| Clinical wording validation | Result messages reviewed for clinical accuracy and tone | Clinical representative |
| High-risk routing validation | All routing permutations behave correctly | Healthcare Systems Architect, QA Engineer |
| Psychologist availability testing | Status changes propagate correctly to routing | QA Engineer |
| Room-allocation testing | No double-booking; correct fallback to queue | QA Engineer |
| Queue-order testing | Red-before-Yellow, FIFO within tier, deterministic | QA Engineer |
| Wonder integration testing | Sandbox and (narrowly) production push correctness | Backend Engineer, Wonder technical team |
| Authentication/authorization testing | RBAC enforced correctly across all portal routes | QA Engineer |
| Security testing | Section 8 checklist verification | Software Architect, QA Engineer |
| Performance testing | Scoring/routing response times acceptable on target tablet hardware | QA Engineer |
| Load testing | Backend sync endpoints under concurrent multi-tablet load | Backend Engineer, DevOps Engineer |
| User acceptance testing | Facility staff walkthrough on real hardware | QA Lead, facility staff |
| Clinical acceptance testing | Clinical representative end-to-end scenario walkthrough | Clinical representative |
| Regression testing | Full suite re-run before each release | QA Lead |

### 7.2 Requirements Traceability

Each requirement in this roadmap should be traceable through:

```
Requirement → User Story → Technical Task → Test Case(s) → Bug(s) if any → Acceptance Evidence → Release Approval
```

Recommended lightweight mechanism: a single traceability table (spreadsheet or lightweight tracker) with one row per requirement, linked to its user story ID, implementing PR(s), covering test case ID(s), and final acceptance evidence (screenshot, test run log, or sign-off note). This does not require heavyweight tooling for MVP1's scale, but must exist in some auditable form given the clinical-safety and compliance context.

### 7.3 QA Deliverables Per Phase

Each phase in Section 5 should produce, at minimum: the phase's own passing test suite (unit/component/integration as applicable), an updated regression suite entry, and — for clinically significant phases (4, 5, 6, 9, 10) — explicit clinical sign-off recorded in the traceability record.

---

## 8. Security, Privacy & Clinical Safety

| Requirement | Implementation approach | Confirmation needed from |
|---|---|---|
| Minimum necessary data collection | Fallback registration limited to First/Middle/Last Name, Phone, National ID — no additional fields collected without justification | Data-protection team |
| Encryption in transit | TLS enforced on all endpoints, including tablet-to-backend sync | Software Architect |
| Encryption at rest | PostgreSQL encryption at rest where infrastructure supports it | DevOps Engineer, hosting provider |
| Secure local storage | IndexedDB is not inherently encrypted; evaluate whether facility tablet device-level encryption is sufficient or additional app-level encryption is warranted | Software Architect, hospital IT |
| Token handling | JWTs short-lived with refresh; never logged in plaintext | Backend Engineer |
| Role-based access control | Enforced at API middleware level, tested per role | Backend Engineer, QA Engineer |
| Session timeout | Psychologist portal sessions expire after a defined inactivity period | Clinical representative (defines acceptable duration for workflow) |
| Device access controls | Facility tablets should be device-locked/kiosk-mode to prevent non-WEMA use | Hospital IT |
| Audit logging | All clinically significant writes logged with actor, timestamp, before/after where feasible | Backend Engineer |
| Sensitive-data masking in logs | Pino redaction rules for patient identifiers, national ID numbers | Backend Engineer |
| Secrets management | No secrets in source control; managed via secrets manager per environment | DevOps Engineer |
| Backup protection | Backups encrypted, access-restricted | DevOps Engineer |
| Data-retention rules | Retention period for patient data, especially fallback-registered records, must align with hospital/data-protection policy | **Requires explicit confirmation from hospital leadership and data-protection team — not a purely technical decision** |
| Failed-sync visibility | Sync-status UI surfaces failures prominently to staff, not silently retried forever without visibility | Frontend Engineer |
| Duplicate-submission prevention | Idempotency keys on all upload endpoints | Backend Engineer |
| Clinical escalation safety | Explicit review confirming no code path silently drops a high-risk classification | Healthcare Systems Architect |
| Prevention of lost high-risk cases | Every high-risk assessment must resolve to a room assignment, queue entry, or synced Wonder record — no dead-end state | Healthcare Systems Architect, QA Lead |
| Safe error messages | User-facing errors never expose stack traces, internal IDs, or PII | Frontend Engineer |
| Consent recording | Consent capture stored locally and synced, timestamped, versioned against the consent text shown | Backend Engineer, Clinical representative |
| Data ownership between WEMA and Wonder | Documented per Section 6.2 — Wonder is the patient-identity source of truth; WEMA owns screening/routing data | Software Architect, Wonder technical team |

**Decisions explicitly flagged for non-technical stakeholder confirmation:** data-retention duration, device access-control policy on facility hardware, and the final consent-text wording — these should not be finalized by engineering alone.

---

## 9. DevOps, Environments & Deployment

### 9.1 Environment Overview

| Environment | Purpose | Wonder endpoint | Data |
|---|---|---|---|
| Local development | Individual engineer workstation | Mock/stubbed | Seed data |
| Development (shared) | Integration point for merged feature branches | Wonder sandbox (if available) or mock | Seed/synthetic data |
| Staging | Pre-production validation, UAT, clinical acceptance testing | Wonder sandbox | Synthetic/test data, production-like volume |
| Production | Live facility use | Wonder production | Real patient data |

### 9.2 Release Flow

```
Feature branch → PR (CI: lint/typecheck/test/build) → merge to development
        ↓
Development environment (auto-deploy, smoke test)
        ↓
Promotion to staging (manual trigger, tagged release candidate)
        ↓
Full QA cycle + UAT + clinical acceptance on staging (Phase 10)
        ↓
Promotion to production (manual trigger, requires sign-offs from Phase 10)
        ↓
Production smoke test + hypercare monitoring window
```

### 9.3 Release-Readiness Checklist

- [ ] All CI checks passing on the release candidate build.
- [ ] Full regression suite passing on staging.
- [ ] Clinical acceptance sign-off obtained.
- [ ] User acceptance sign-off obtained.
- [ ] Security checklist (Section 8) fully addressed or explicitly deferred with owner sign-off.
- [ ] No open release-blocking bugs.
- [ ] Backup/restore procedure verified for the current schema version.
- [ ] Rollback procedure rehearsed for this release.
- [ ] Monitoring/alerting confirmed functional (test alert triggered and received).
- [ ] Wonder production endpoint smoke-tested (narrow, controlled test).
- [ ] Documentation (Section 10) updated to match the release.
- [ ] Change log / release notes prepared.
- [ ] Hypercare on-call owner assigned.

---

## 10. Project Management & Milestones

### 10.1 Milestone Summary

| Milestone | Corresponds to | Stakeholder sign-off required |
|---|---|---|
| M0 — Architecture & Access Confirmed | Phase 0 | Hospital leadership, clinical lead, Wonder technical team |
| M1 — Environment Ready | Phase 1 | Software Architect |
| M2 — Schema & Core Backend | Phase 2 | Software Architect, Healthcare Systems Architect |
| M3 — Offline Foundation Proven | Phase 3 | QA Lead |
| M4 — EPDS Scoring Clinically Validated | Phase 4 | Clinical representative |
| M5 — Routing/Queue Clinically Safe | Phase 5 | Healthcare Systems Architect |
| M6 — No-CHP Sync/Alert Flow Verified | Phase 6 | Wonder technical team |
| M7 — Psychologist Portal Functional | Phase 7 | Clinical representative |
| M8 — Content & Accessibility Validated | Phase 8 | Clinical representative, language reviewers |
| M9 — Security & Clinical-Safety Hardened | Phase 9 | Software Architect, Healthcare Systems Architect |
| M10 — QA/UAT/Clinical Acceptance Complete | Phase 10 | QA Lead, Clinical representative, facility staff |
| M11 — Production Live | Phase 11 | Project Manager, hospital leadership |
| M12 — Handover Complete | Phase 12 | Project Manager, receiving operational team |

### 10.2 Sprint Structure (Recommended)

Two-week sprints, roughly aligned 1:1 with the phases above from Sprint 1 onward (Phase 0 is pre-sprint discovery). Phases 7 and 8 overlap by design. Total estimated timeline: **approximately 20–22 weeks (10–11 sprints) from Phase 1 start to production go-live**, excluding Phase 0 discovery time — with the explicit caveat below.

> **On timeline realism:** This estimate assumes Wonder sandbox access, translated content, and clinical review availability are not blocking. Any delay in Wonder API access, content readiness, or clinical stakeholder availability directly extends the timeline — these are treated as hard dependencies, not risks to be silently absorbed into engineering velocity.

### 10.3 Definition of Ready (for a sprint task)

- User story has a clear acceptance criterion.
- Any clinical wording involved has at least a draft reviewed by the clinical representative.
- Dependencies on prior phases are met (schema exists, upstream service is functional).
- Design exists for any UI-touching task (or is explicitly marked "review existing design only").

### 10.4 Definition of Done (for a sprint task)

- Code merged via PR with passing CI.
- Unit/component tests written and passing for the touched logic.
- No new entries introduced to the security checklist without mitigation.
- Documentation updated if the task changes an API, schema, or architectural decision.
- QA has verified the acceptance criterion, not just the developer.

### 10.5 Dependency Map (Key Cross-Phase Dependencies)

- Phase 4 (EPDS scoring) depends on Phase 2 (schema) and Phase 3 (offline foundation).
- Phase 5 (routing/queue) depends on Phase 4 (classification output).
- Phase 6 (sync/Wonder) depends on Phase 0 (Wonder access) and Phase 5 (routing decisions to sync).
- Phase 7 (portal) depends on Phase 2 (auth) and Phase 5 (availability/queue services).
- Phase 10 (QA/UAT) depends on all of Phases 1–9 being substantially complete.
- Phase 11 (deployment) depends on Phase 10 sign-off.

### 10.6 Risk Register (Top Risks)

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Wonder sandbox/API access delayed | Medium | High | Build adapter against documented/mocked contract first | Wonder technical team + Backend Engineer |
| Translated content (Kiswahili/Luo) not ready in time | Medium | Medium | Build English-first, i18n-ready; drop in translations without code change | Project Manager, Clinical representative |
| Clinical reviewer availability constrained | Medium | High | Schedule clinical review checkpoints at phase boundaries in advance, not ad hoc | Project Manager |
| Tablet hardware constraints (storage, performance) discovered late | Low–Medium | Medium | Target-hardware testing begins as early as Phase 3, not deferred to Phase 10 | QA Lead |
| Data-retention/consent policy undecided by hospital leadership | Medium | High | Explicitly flagged in Phase 9 as requiring non-technical sign-off; do not let engineering default a policy | Project Manager |
| Scope creep reintroducing CHP-like functionality | Low | High | Architecture explicitly documented (this roadmap) and enforced via CI check in Phase 6 | Software Architect |

### 10.7 Decision Log Structure (Recommended)

A simple running log: `Decision ID | Date | Decision | Rationale | Alternatives considered | Owner | Status`. Recorded at minimum for every "Technical decisions" item listed under each phase in Section 5.

### 10.8 Change-Request Process (Recommended)

Any change to scope, schema, or the no-CHP architecture decision must be: (1) documented as a proposed change with rationale, (2) reviewed by the Software Architect and Healthcare Systems Architect for technical/clinical impact, (3) approved by the Project Manager and, for clinical-safety-relevant changes, the clinical representative, before implementation begins.

### 10.9 Stakeholder Review Process

Phase-boundary reviews (per the "Gate to next phase" criteria in Section 5) serve as the primary stakeholder review checkpoints. Each should include a short demo, not just a status report.

### 10.10 Technical Documentation Checklist

- [ ] Architecture overview (this document) kept current.
- [ ] API reference for all endpoint groups (Section 6.1).
- [ ] ER diagram and schema documentation.
- [ ] Wonder adapter contract documentation.
- [ ] Runbooks: sync failure, Wonder outage, tablet loss/replacement, rollback procedure.
- [ ] Onboarding README for new engineers.
- [ ] Decision log (Section 10.7).

### 10.11 Deployment Handover Checklist

- [ ] Production credentials/secrets transferred to the operational owner via secure channel.
- [ ] Monitoring/alerting ownership transferred.
- [ ] Runbooks reviewed with the receiving operational team.
- [ ] Support-tier response times agreed (Phase 12).
- [ ] Known issues/deferrals list reviewed and accepted.

### 10.12 Post-Launch Support Plan (Outline)

- Standard bug triage on an agreed cadence (e.g., weekly).
- **Clinical-safety incidents** (any suspected lost/misrouted high-risk case) treated as immediate-escalation, out-of-band from standard bug triage, with a named on-call owner.
- Periodic review of sync/error logs and Wonder integration health, not only reactive to reported issues.
- Defined path for MVP2 kickoff, building on the schema and shared scoring-engine forward-compatibility established in Phase 2 and Phase 4.

---

## 11. Final Recommended Implementation Sequence

1. **Phase 0** — Project Initiation & Discovery *(architecture and access sign-off)*
2. **Phase 1** — Environment, Repository & CI/CD Foundation
3. **Phase 2** — Data Model & Core Backend Foundations
4. **Phase 3** — Offline-First Frontend Foundation
5. **Phase 4** — EPDS Screening Tool & Local Scoring Engine
6. **Phase 5** — Routing, Availability, Room Allocation & Queue
7. **Phase 6** — Alerts, Notifications & Wonder Sync (No-CHP End-of-Day Flow)
8. **Phase 7** — Psychologist Portal *(overlaps Phase 8)*
9. **Phase 8** — Multilingual, Accessibility & Content Validation *(overlaps Phase 7)*
10. **Phase 9** — Security, Privacy & Clinical Safety Hardening
11. **Phase 10** — Full QA Cycle & Clinical/User Acceptance Testing
12. **Phase 11** — Staging & Production Environment Setup, Deployment
13. **Phase 12** — Handover & Post-Launch Support

**Guiding principle throughout:** no phase's "gate to next phase" criteria are waived for schedule pressure where clinical safety, data integrity, or the confirmed no-CHP architecture boundary is at stake. Where a dependency (Wonder access, translated content, clinical reviewer time) is outside engineering's control, the schedule impact is stated explicitly rather than absorbed silently into velocity assumptions.

---

*End of document.*
