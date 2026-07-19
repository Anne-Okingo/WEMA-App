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

**Recommendation: begin containerizing from Phase 1, but keep it lightweight. The goal is to ensure every developer runs the same backend environment while keeping frontend development fast and simple.**

For WEMA, instead of telling every developer to:

- install PostgreSQL manually;
- configure the backend API manually;
- install the exact Node.js version;
- configure and run background workers manually;

provide a Docker setup that starts the required services consistently.

- **Why start early:** WEMA's backend has multiple moving parts from day one — the API server, background workers, PostgreSQL, and the Wonder adapter configuration. Establishing Docker Compose in Phase 1 means every developer runs an identical environment from the first commit, while staging and production Dockerfiles are refined incrementally rather than retrofitted under deadline pressure. Retrofitting containerization after MVP1 is functionally complete is a common source of "works on my machine" defects and wasted QA cycles.
- **What should be containerized:** The backend API and background workers should have dedicated Dockerfiles and separate Compose services. PostgreSQL should use the official PostgreSQL image as its own Compose service.
- **Local development:** Docker Compose brings up PostgreSQL, the backend API, and workers with one command. Environment variables are supplied through a local `.env` file derived from `.env.example`. The local `.env` file must never be committed.
- **Frontend in a container? No, not during active development.** The React/Vite applications should run directly on the developer's machine using `npm run dev` to preserve fast hot-module replacement. Containerizing the frontend during active development adds file-watching overhead and volume-mount complexity with little benefit at this stage.
- **Frontend deployment:** For staging and production, the React applications should be built into reproducible static bundles and served through Nginx, a containerized web server, or an approved static-hosting platform.
- **Staging versus production:** Staging should use the same application images as production but with seeded test data, more detailed logging, controlled test notification destinations, and a Wonder sandbox or test endpoint. Production should use hardened multi-stage images, exclude development dependencies, use production logging levels, inject real secrets securely, and connect to the live Wonder endpoint.
- **Service separation:** The backend API and workers should run as separate services so they can be restarted and scaled independently.
- **Production PostgreSQL:** PostgreSQL should preferably run as a managed database service in production rather than as a self-hosted container, because managed services provide stronger backup, restore, monitoring, and failover capabilities.

---

## 4. Repository & File Structure

### 4.1 Recommendation: Monorepo

**Recommendation: A single monorepo containing the patient application, psychologist portal, backend API, background workers, shared packages, infrastructure configuration, and documentation.**

WEMA's frontend and backend components evolve together closely. A scoring-rule change, a new screening tool, a workflow update, or a Wonder field-mapping change may affect:

- shared domain types;
- frontend forms;
- local validation;
- backend validation;
- workflow orchestration;
- database schemas;
- background jobs;
- integration mappings;
- automated tests.

A monorepo allows these related changes to be developed, reviewed, tested, and released together through one pull request and one CI pipeline.

It also reduces the risk of version mismatch between shared packages and the applications that depend on them. For example, the patient application, psychologist portal, backend API, and workers can all use the same definitions for:

- `EPDS_WONDER`;
- `GENERAL_PUBLIC_PHQ`;
- assessment schemas;
- risk classifications;
- routing decisions;
- synchronization payloads;
- queue and assignment states;
- Wonder integration contracts.

For a small delivery team, a monorepo is easier to manage and onboard into:

> Clone one repository, install dependencies, start the required services, and run the full system.

The coordination overhead of maintaining separate repositories, independent package versions, and different release schedules would outweigh the isolation benefits for MVP1.

### 4.2 Proposed Directory Tree

```
wema/
├── apps/
│   ├── frontend/
│   │   ├── patient-app/
│   │   │   ├── src/
│   │   │   │   ├── app/
│   │   │   │   │   ├── App.tsx
│   │   │   │   │   ├── routes.tsx
│   │   │   │   │   ├── providers.tsx
│   │   │   │   │   ├── workflow-entry.ts
│   │   │   │   │   ├── startup.ts
│   │   │   │   │   └── error-boundary.tsx
│   │   │   │   │
│   │   │   │   ├── workflows/
│   │   │   │   │   ├── epds-wonder/
│   │   │   │   │   │   ├── epds-wonder.routes.tsx
│   │   │   │   │   │   ├── epds-wonder.workflow.ts
│   │   │   │   │   │   ├── epds-wonder.types.ts
│   │   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── hooks/
│   │   │   │   │   │   └── tests/
│   │   │   │   │   │
│   │   │   │   │   └── general-public-phq/
│   │   │   │   │       ├── general-public-phq.routes.tsx
│   │   │   │   │       ├── general-public-phq.workflow.ts
│   │   │   │   │       ├── general-public-phq.types.ts
│   │   │   │   │       ├── screens/
│   │   │   │   │       ├── hooks/
│   │   │   │   │       └── tests/
│   │   │   │   │
│   │   │   │   ├── features/
│   │   │   │   │   ├── language/
│   │   │   │   │   ├── consent/
│   │   │   │   │   ├── wonder-patient-identification/
│   │   │   │   │   ├── wema-patient-registration/
│   │   │   │   │   ├── screening-runner/
│   │   │   │   │   ├── results/
│   │   │   │   │   ├── routing/
│   │   │   │   │   ├── room-assignment/
│   │   │   │   │   ├── waiting-queue/
│   │   │   │   │   ├── psychoeducation/
│   │   │   │   │   ├── media/
│   │   │   │   │   │   ├── audio/
│   │   │   │   │   │   └── text/
│   │   │   │   │   └── session-reset/
│   │   │   │   │
│   │   │   │   ├── offline/
│   │   │   │   │   ├── database/
│   │   │   │   │   │   ├── database.ts
│   │   │   │   │   │   ├── schema.ts
│   │   │   │   │   │   ├── table-names.ts
│   │   │   │   │   │   └── migrations/
│   │   │   │   │   │
│   │   │   │   │   ├── repositories/
│   │   │   │   │   │   ├── patient.repository.ts
│   │   │   │   │   │   ├── session.repository.ts
│   │   │   │   │   │   ├── assessment.repository.ts
│   │   │   │   │   │   ├── resource.repository.ts
│   │   │   │   │   │   └── outbox.repository.ts
│   │   │   │   │   │
│   │   │   │   │   ├── outbox/
│   │   │   │   │   │   ├── outbox.types.ts
│   │   │   │   │   │   ├── outbox.factory.ts
│   │   │   │   │   │   ├── outbox.processor.ts
│   │   │   │   │   │   ├── retry-policy.ts
│   │   │   │   │   │   └── outbox-status.ts
│   │   │   │   │   │
│   │   │   │   │   ├── synchronization/
│   │   │   │   │   │   ├── push-sync.ts
│   │   │   │   │   │   ├── pull-sync.ts
│   │   │   │   │   │   ├── sync-engine.ts
│   │   │   │   │   │   ├── conflict-policy.ts
│   │   │   │   │   │   ├── sync-status.ts
│   │   │   │   │   │   └── sync-errors.ts
│   │   │   │   │   │
│   │   │   │   │   ├── connectivity/
│   │   │   │   │   │   ├── connectivity.service.ts
│   │   │   │   │   │   └── use-connectivity.ts
│   │   │   │   │   │
│   │   │   │   │   └── service-worker/
│   │   │   │   │       ├── register-service-worker.ts
│   │   │   │   │       ├── cache-policy.ts
│   │   │   │   │       └── update-policy.ts
│   │   │   │   │
│   │   │   │   ├── device/
│   │   │   │   │   ├── device-identity.ts
│   │   │   │   │   ├── credential-storage.ts
│   │   │   │   │   ├── device-registration.ts
│   │   │   │   │   └── device-status.ts
│   │   │   │   │
│   │   │   │   ├── api/
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── interceptors.ts
│   │   │   │   │   ├── endpoints.ts
│   │   │   │   │   └── errors.ts
│   │   │   │   │
│   │   │   │   ├── shared/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── layouts/
│   │   │   │   │   ├── utils/
│   │   │   │   │   └── constants/
│   │   │   │   │
│   │   │   │   ├── i18n/
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── language.types.ts
│   │   │   │   │   └── resource-loader.ts
│   │   │   │   │
│   │   │   │   └── main.tsx
│   │   │   │
│   │   │   ├── public/
│   │   │   │   ├── icons/
│   │   │   │   └── offline/
│   │   │   │
│   │   │   ├── tests/
│   │   │   │   ├── integration/
│   │   │   │   └── e2e/
│   │   │   │
│   │   │   ├── vite.config.ts
│   │   │   ├── tsconfig.json
│   │   │   └── package.json
│   │   │
│   │   └── psychologist-portal/
│   │       ├── src/
│   │       │   ├── app/
│   │       │   │   ├── App.tsx
│   │       │   │   ├── routes.tsx
│   │       │   │   ├── providers.tsx
│   │       │   │   ├── startup.ts
│   │       │   │   ├── protected-route.tsx
│   │       │   │   └── error-boundary.tsx
│   │       │   │
│   │       │   ├── features/
│   │       │   │   ├── authentication/
│   │       │   │   ├── profile/
│   │       │   │   ├── shift/
│   │       │   │   ├── availability/
│   │       │   │   ├── rooms/
│   │       │   │   ├── queue/
│   │       │   │   ├── assignments/
│   │       │   │   ├── consultations/
│   │       │   │   └── scheduling/
│   │       │   │
│   │       │   ├── api/
│   │       │   │   ├── client.ts
│   │       │   │   ├── auth.api.ts
│   │       │   │   ├── operations.api.ts
│   │       │   │   ├── scheduling.api.ts
│   │       │   │   └── errors.ts
│   │       │   │
│   │       │   ├── auth/
│   │       │   │   ├── token-storage.ts
│   │       │   │   ├── session.ts
│   │       │   │   └── authorization.ts
│   │       │   │
│   │       │   ├── shared/
│   │       │   │   ├── components/
│   │       │   │   ├── hooks/
│   │       │   │   ├── layouts/
│   │       │   │   └── utils/
│   │       │   │
│   │       │   ├── i18n/
│   │       │   └── main.tsx
│   │       │
│   │       ├── public/
│   │       ├── tests/
│   │       │   ├── integration/
│   │       │   └── e2e/
│   │       ├── vite.config.ts
│   │       ├── tsconfig.json
│   │       └── package.json
│   │
│   └── backend/
│       ├── api/
│       │   ├── src/
│       │   │   ├── app/
│       │   │   │   ├── app.ts
│       │   │   │   ├── server.ts
│       │   │   │   ├── routes.ts
│       │   │   │   ├── startup.ts
│       │   │   │   └── shutdown.ts
│       │   │   │
│       │   │   ├── modules/
│       │   │   │   ├── authentication/
│       │   │   │   ├── users/
│       │   │   │   ├── devices/
│       │   │   │   ├── facilities/
│       │   │   │   ├── patients/
│       │   │   │   ├── consent/
│       │   │   │   ├── screening-sessions/
│       │   │   │   ├── assessments/
│       │   │   │   ├── psychologists/
│       │   │   │   ├── availability/
│       │   │   │   ├── rooms/
│       │   │   │   ├── queue/
│       │   │   │   ├── assignments/
│       │   │   │   ├── consultations/
│       │   │   │   ├── scheduling/
│       │   │   │   ├── synchronization/
│       │   │   │   ├── notifications/
│       │   │   │   ├── media/
│       │   │   │   ├── audit/
│       │   │   │   ├── system-configuration/
│       │   │   │   └── health/
│       │   │   │
│       │   │   ├── workflows/
│       │   │   │   ├── workflow-registry.ts
│       │   │   │   ├── workflow.types.ts
│       │   │   │   ├── workflow-validator.ts
│       │   │   │   ├── epds-wonder.workflow.ts
│       │   │   │   └── general-public-phq.workflow.ts
│       │   │   │
│       │   │   ├── integrations/
│       │   │   │   ├── wonder/
│       │   │   │   │   ├── wonder.client.ts
│       │   │   │   │   ├── wonder.auth.ts
│       │   │   │   │   ├── wonder.config.ts
│       │   │   │   │   ├── wonder.types.ts
│       │   │   │   │   ├── patient.mapper.ts
│       │   │   │   │   ├── epds-result.mapper.ts
│       │   │   │   │   ├── wonder.errors.ts
│       │   │   │   │   └── tests/
│       │   │   │   │
│       │   │   │   └── whatsapp/
│       │   │   │       ├── whatsapp.client.ts
│       │   │   │       ├── whatsapp.config.ts
│       │   │   │       ├── public-risk-alert.mapper.ts
│       │   │   │       ├── whatsapp.errors.ts
│       │   │   │       └── tests/
│       │   │   │
│       │   │   ├── middleware/
│       │   │   │   ├── authentication.middleware.ts
│       │   │   │   ├── device-auth.middleware.ts
│       │   │   │   ├── authorization.middleware.ts
│       │   │   │   ├── validation.middleware.ts
│       │   │   │   ├── request-id.middleware.ts
│       │   │   │   ├── logging.middleware.ts
│       │   │   │   └── error-handler.middleware.ts
│       │   │   │
│       │   │   ├── config/
│       │   │   │   ├── environment.ts
│       │   │   │   ├── database.ts
│       │   │   │   ├── security.ts
│       │   │   │   └── jobs.ts
│       │   │   │
│       │   │   └── shared/
│       │   │       ├── errors/
│       │   │       ├── http/
│       │   │       ├── utils/
│       │   │       └── constants/
│       │   │
│       │   ├── tests/
│       │   │   ├── unit/
│       │   │   ├── integration/
│       │   │   ├── api/
│       │   │   └── contract/
│       │   │
│       │   ├── Dockerfile
│       │   ├── tsconfig.json
│       │   └── package.json
│       │
│       └── worker/
│           ├── src/
│           │   ├── jobs/
│           │   │   ├── refresh-wonder-patients.job.ts
│           │   │   ├── push-epds-to-wonder.job.ts
│           │   │   ├── send-general-public-whatsapp-alert.job.ts
│           │   │   ├── retry-failed-synchronization.job.ts
│           │   │   └── export-audit-events.job.ts
│           │   │
│           │   ├── queue/
│           │   │   ├── queue-client.ts
│           │   │   ├── queue-names.ts
│           │   │   ├── retry-policy.ts
│           │   │   ├── idempotency.ts
│           │   │   └── dead-letter-policy.ts
│           │   │
│           │   ├── config/
│           │   │   ├── environment.ts
│           │   │   └── jobs.ts
│           │   │
│           │   ├── worker.ts
│           │   ├── startup.ts
│           │   └── shutdown.ts
│           │
│           ├── tests/
│           │   ├── unit/
│           │   ├── integration/
│           │   └── contract/
│           │
│           ├── Dockerfile
│           ├── tsconfig.json
│           └── package.json
│
├── packages/
│   ├── application/
│   │   ├── src/
│   │   │   ├── patients/
│   │   │   │   ├── register-wema-patient.use-case.ts
│   │   │   │   └── resolve-wonder-patient.use-case.ts
│   │   │   ├── consent/
│   │   │   │   └── record-consent.use-case.ts
│   │   │   ├── assessments/
│   │   │   │   ├── start-assessment.use-case.ts
│   │   │   │   ├── complete-assessment.use-case.ts
│   │   │   │   └── verify-assessment-result.use-case.ts
│   │   │   ├── routing/
│   │   │   │   └── route-patient.use-case.ts
│   │   │   ├── queue/
│   │   │   │   ├── create-queue-entry.use-case.ts
│   │   │   │   └── assign-next-patient.use-case.ts
│   │   │   ├── consultations/
│   │   │   │   └── complete-consultation.use-case.ts
│   │   │   ├── scheduling/
│   │   │   │   └── schedule-follow-up.use-case.ts
│   │   │   ├── synchronization/
│   │   │   │   ├── process-sync-batch.use-case.ts
│   │   │   │   └── resolve-sync-conflict.use-case.ts
│   │   │   └── integrations/
│   │   │       ├── enqueue-wonder-result.use-case.ts
│   │   │       └── enqueue-public-alert.use-case.ts
│   │   └── package.json
│   │
│   ├── assessment-tools/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── assessment-tool.types.ts
│   │   │   │   ├── answer-option.types.ts
│   │   │   │   ├── assessment-version.ts
│   │   │   │   └── content-reference.types.ts
│   │   │   ├── epds/
│   │   │   │   ├── definition.ts
│   │   │   │   ├── questions.ts
│   │   │   │   ├── answer-options.ts
│   │   │   │   ├── interpretation.ts
│   │   │   │   └── index.ts
│   │   │   ├── phq2/
│   │   │   │   ├── definition.ts
│   │   │   │   ├── questions.ts
│   │   │   │   ├── answer-options.ts
│   │   │   │   ├── interpretation.ts
│   │   │   │   └── index.ts
│   │   │   └── phq9/
│   │   │       ├── definition.ts
│   │   │       ├── questions.ts
│   │   │       ├── answer-options.ts
│   │   │       ├── interpretation.ts
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── identifiers.schema.ts
│   │   │   │   ├── pagination.schema.ts
│   │   │   │   └── timestamps.schema.ts
│   │   │   ├── patients/
│   │   │   ├── consent/
│   │   │   ├── assessments/
│   │   │   ├── screening-sessions/
│   │   │   ├── routing/
│   │   │   ├── queue/
│   │   │   ├── assignments/
│   │   │   ├── consultations/
│   │   │   ├── scheduling/
│   │   │   ├── psychologists/
│   │   │   ├── facilities/
│   │   │   ├── devices/
│   │   │   ├── api/
│   │   │   ├── events/
│   │   │   ├── jobs/
│   │   │   │   ├── job-envelope.schema.ts
│   │   │   │   ├── refresh-wonder-patients.schema.ts
│   │   │   │   ├── push-epds-to-wonder.schema.ts
│   │   │   │   └── send-public-risk-alert.schema.ts
│   │   │   ├── synchronization/
│   │   │   │   ├── sync-envelope.schema.ts
│   │   │   │   ├── push-request.schema.ts
│   │   │   │   ├── push-response.schema.ts
│   │   │   │   ├── pull-request.schema.ts
│   │   │   │   ├── pull-response.schema.ts
│   │   │   │   ├── cursor.schema.ts
│   │   │   │   ├── conflict.schema.ts
│   │   │   │   ├── tombstone.schema.ts
│   │   │   │   ├── sync-error.schema.ts
│   │   │   │   └── protocol-version.ts
│   │   │   └── integrations/
│   │   │       ├── wonder/
│   │   │       └── whatsapp/
│   │   └── package.json
│   │
│   ├── scoring/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── scoring.types.ts
│   │   │   │   ├── scoring-result.ts
│   │   │   │   └── scoring-version.ts
│   │   │   ├── epds/
│   │   │   │   ├── score-epds.ts
│   │   │   │   ├── epds-scoring.version.ts
│   │   │   │   └── tests/
│   │   │   ├── phq2/
│   │   │   │   ├── score-phq2.ts
│   │   │   │   ├── phq2-scoring.version.ts
│   │   │   │   └── tests/
│   │   │   └── phq9/
│   │   │       ├── score-phq9.ts
│   │   │       ├── phq9-scoring.version.ts
│   │   │       └── tests/
│   │   └── package.json
│   │
│   ├── clinical-rules/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   │   ├── clinical-rule.types.ts
│   │   │   │   ├── rule-version.ts
│   │   │   │   ├── routing-result.ts
│   │   │   │   └── safety-invariants.ts
│   │   │   ├── epds/
│   │   │   │   ├── classification.rules.ts
│   │   │   │   ├── routing.rules.ts
│   │   │   │   ├── safety.rules.ts
│   │   │   │   ├── clinical-messages.ts
│   │   │   │   ├── versions.ts
│   │   │   │   └── tests/
│   │   │   └── general-public-phq/
│   │   │       ├── phq2-continuation.rules.ts
│   │   │       ├── classification.rules.ts
│   │   │       ├── routing.rules.ts
│   │   │       ├── safety.rules.ts
│   │   │       ├── clinical-messages.ts
│   │   │       ├── versions.ts
│   │   │       └── tests/
│   │   └── package.json
│   │
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── transactions/
│   │   │   ├── repositories/
│   │   │   ├── audit/
│   │   │   │   ├── audit.repository.ts
│   │   │   │   └── transactional-audit.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── config/
│   │   ├── src/
│   │   │   ├── environment.schema.ts
│   │   │   ├── workflow-config.ts
│   │   │   ├── facility-config.ts
│   │   │   ├── clinical-config.ts
│   │   │   ├── content-config.ts
│   │   │   └── feature-flags.ts
│   │   └── package.json
│   │
│   ├── observability/
│   │   ├── src/
│   │   │   ├── logger.ts
│   │   │   ├── correlation-id.ts
│   │   │   ├── redaction.ts
│   │   │   ├── error-monitoring.ts
│   │   │   └── metrics.ts
│   │   └── package.json
│   │
│   ├── testing/
│   │   ├── src/
│   │   │   ├── fixtures/
│   │   │   │   ├── patients/
│   │   │   │   ├── assessments/
│   │   │   │   ├── facilities/
│   │   │   │   ├── psychologists/
│   │   │   │   └── synchronization/
│   │   │   ├── builders/
│   │   │   ├── stubs/
│   │   │   │   ├── wonder/
│   │   │   │   └── whatsapp/
│   │   │   ├── golden-cases/
│   │   │   │   ├── epds/
│   │   │   │   ├── phq2/
│   │   │   │   └── phq9/
│   │   │   └── test-database/
│   │   └── package.json
│   │
│   └── ui/
│       ├── src/
│       │   ├── components/
│       │   ├── forms/
│       │   ├── feedback/
│       │   ├── accessibility/
│       │   ├── tokens/
│       │   └── index.ts
│       └── package.json
│
├── content/
│   ├── source/
│   │   ├── translations/
│   │   │   ├── en/
│   │   │   │   ├── common.json
│   │   │   │   ├── consent.json
│   │   │   │   ├── epds.json
│   │   │   │   ├── phq2.json
│   │   │   │   ├── phq9.json
│   │   │   │   ├── results.json
│   │   │   │   └── routing.json
│   │   │   ├── sw/
│   │   │   └── luo/
│   │   ├── audio/
│   │   │   ├── en/
│   │   │   ├── sw/
│   │   │   └── luo/
│   │   ├── avatar/
│   │   │   ├── assets/
│   │   │   ├── animations/
│   │   │   └── scripts/
│   │   ├── video/
│   │   │   ├── en/
│   │   │   ├── sw/
│   │   │   └── luo/
│   │   └── clinical-messages/
│   │       ├── en/
│   │       ├── sw/
│   │       └── luo/
│   │
│   ├── manifests/
│   │   ├── content-manifest.json
│   │   ├── audio-manifest.json
│   │   ├── video-manifest.json
│   │   ├── screening-tools.json
│   │   └── content-version.json
│   │
│   └── generated/
│       ├── validated-content/
│       └── generated-manifest.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── frontend.Dockerfile
│   │   ├── nginx.conf
│   │   └── docker-compose.override.yml
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
│       ├── README.md
│       ├── secret-management.md
│       ├── data-protection.md
│       └── policies/
│
├── docs/
│   ├── architecture/
│   │   ├── system-context.md
│   │   ├── component-map.md
│   │   ├── data-ownership.md
│   │   ├── deployment-view.md
│   │   ├── synchronization-design.md
│   │   └── decisions/
│   │
│   ├── workflows/
│   │   ├── epds-wonder.md
│   │   └── general-public-phq.md
│   │
│   ├── integrations/
│   │   ├── wonder/
│   │   └── whatsapp/
│   │
│   ├── clinical/
│   │   ├── assessment-tools.md
│   │   ├── scoring-versions.md
│   │   ├── clinical-rules.md
│   │   └── clinical-approval-register.md
│   │
│   ├── privacy/
│   │   ├── consent.md
│   │   ├── retention-policy.md
│   │   └── data-access.md
│   │
│   ├── api/
│   ├── database/
│   ├── testing/
│   ├── deployment/
│   ├── security/
│   │
│   │
│   └── runbooks/
│       ├── sync-failure.md
│       ├── wonder-outage.md
│       ├── whatsapp-failure.md
│       ├── tablet-replacement.md
│       ├── database-restore.md
│       └── rollback.md
│
├── scripts/
│   ├── setup/
│   │   ├── install.ts
│   │   └── verify-environment.ts
│   ├── database/
│   │   ├── migrate.ts
│   │   ├── seed.ts
│   │   └── reset-local.ts
│   ├── content/
│   │   ├── validate-content.ts
│   │   ├── build-manifest.ts
│   │   └── verify-translations.ts
│   ├── testing/
│   │   ├── run-contract-tests.ts
│   │   └── run-golden-cases.ts
│   └── maintenance/
│       ├── rotate-device-credential.ts
│       └── verify-backup.ts
│
├── .github/
│   ├── workflows/
│   │   ├── pull-request.yml
│   │   ├── clinical-rules-check.yml
│   │   ├── deploy-staging.yml
│   │   └── deploy-production.yml
│   ├── ISSUE_TEMPLATE/
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── vitest.workspace.ts
├── playwright.config.ts
├── eslint.config.js
├── prettier.config.js
├── CONTRIBUTING.md
└── README.md
```
---