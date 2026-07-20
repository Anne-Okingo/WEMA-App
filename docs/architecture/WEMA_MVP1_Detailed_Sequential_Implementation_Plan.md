# WEMA MVP1 — Detailed Sequential Implementation Plan

## Document Purpose

This document provides a detailed, phase-by-phase implementation plan for the updated WEMA MVP1.

It aligns implementation work with the confirmed MVP1 scope:

1. **EPDS–Wonder workflow**
   - Used for pregnant and postpartum patients.
   - Patient identity is sourced from Wonder where available.
   - EPDS results are stored in WEMA and pushed to Wonder.
   - Wonder remains the primary clinical record and owns downstream community follow-up.
   - WEMA handles local routing, psychologist availability, rooms, queueing, and psychoeducation.
   - WEMA does **not** send the General Public WhatsApp alert for EPDS cases.

2. **General Public PHQ workflow**
   - Uses WEMA patient registration.
   - Begins with PHQ-2.
   - Continues to PHQ-9 when continuation rules are met.
   - Results remain in WEMA and are not sent to Wonder.
   - High-risk General Public cases trigger a WEMA-managed WhatsApp alert.
   - Follow-up scheduling is supported in the Psychologist Portal.

The plan also assumes:

- WEMA is local-first and offline-first.
- The Patient App is a rich web application, not a conventional installable PWA.
- A Service Worker is still used for offline caching.
- IndexedDB/Dexie stores local operational and screening data.
- No Admin Portal is included in MVP1.
- No CHP task creation, CHP assignment, SMS escalation, or home-visit workflow exists in MVP1.
- The operational dashboard and advanced reporting are deferred to MVP2.
- Patient App designs already exist and are approved.
- The Psychologist Portal still requires UI/UX design.

---

# 1. Delivery Principles

| Principle | Meaning for implementation |
|---|---|
| Offline-first | Every core patient-screening step must work without internet after the application and required content are available locally |
| Local-first writes | Patient data is saved locally first, then synchronized |
| Workflow separation | EPDS–Wonder and General Public PHQ must remain distinct while reusing shared features |
| Clinical traceability | Assessment, scoring, rule, consent, and content versions must be stored |
| No silent failure | Failed sync, failed alerts, and failed Wonder pushes must be visible and retryable |
| Minimum necessary scope | Build MVP1 deliverables only; avoid premature Admin Portal, analytics, or future tool implementation |
| Safety before speed | Clinical scoring, classification, routing, and high-risk handling require formal validation |
| Clear ownership | Every deliverable has a named primary owner and approval role |
| Incremental delivery | Each phase ends with demonstrable working software and acceptance evidence |

---

# 2. Team Roles

| Role | Main responsibility |
|---|---|
| Technical Project Manager | Scope control, sequencing, dependency management, sign-offs, risk tracking, stakeholder coordination |
| Senior Software Architect | Architecture quality, technical decisions, code boundaries, scalability, security |
| Healthcare Systems Architect / Clinical Lead | Clinical workflow validation, scoring/routing approval, safety review |
| Frontend Engineer | Patient App and Psychologist Portal implementation |
| Backend Engineer | API, database, worker, synchronization, Wonder and WhatsApp integrations |
| UI/UX Designer | Psychologist Portal design and validation of missing/error/offline states |
| QA Lead / QA Engineer | Test strategy, test execution, traceability, regression, UAT coordination |
| DevOps Engineer | Docker, CI/CD, environments, deployment, monitoring, backups, secrets |
| Wonder Technical Team | Wonder API contract, sandbox, mapping, and production integration validation |
| Facility Representatives | Workflow validation and user acceptance testing |
| Language Reviewers | Kiswahili and Luo clinical-content validation |

---

# 3. Phase Structure

Each phase contains:

- objective;
- reason for the phase;
- prerequisites;
- detailed activities;
- technical implementation;
- role assignments;
- deliverables;
- tests;
- acceptance criteria;
- risks;
- gate to the next phase.

The phases are sequential, but some work can overlap where stated.

---

# Phase 1 — Repository, Development Environment, and Engineering Standards

This phase creates the engineering foundation for the entire WEMA project. The team sets up the monorepo, frontend applications, backend services, shared packages, Docker environment, coding standards, automated tests, GitHub workflows, and developer documentation. At the end of this phase, every developer should be able to clone the repository, install dependencies, start the required services, run tests, and contribute code using the same agreed structure.

This work must happen before feature development because inconsistent environments create delays and hidden defects. Without a shared foundation, one developer may use different dependency versions, folder conventions, formatting rules, or database settings from another. Phase 1 therefore establishes one reliable way of working and ensures that every future change is automatically checked for formatting, type errors, test failures, and build problems before it is merged.

## Objective

Create the WEMA monorepo foundation and make it possible for every developer to run, test, and contribute consistently.

## Detailed Activities

- Scaffold the approved monorepo structure.
- Configure npm workspaces.
- Configure shared TypeScript, ESLint, Prettier, Vitest, and Playwright settings.
- Add Docker Compose for PostgreSQL, API, worker, and queue dependencies.
- Create `.env.example` and secrets-handling rules.
- Add README and CONTRIBUTING guidance.
- Add GitHub pull-request checks: install → lint → typecheck → unit test → build.
- Add CODEOWNERS and pull-request template.

## Deliverables

- Working monorepo.
- `docker-compose up` starts backend dependencies.
- Skeleton Patient App, Portal, API, and Worker all build.
- Green CI pipeline.
- New-developer onboarding documentation.

## Acceptance Criteria

- A new developer can start the project within 30 minutes.
- All four applications build.
- CI blocks lint and typecheck failures.
- Secrets are not committed.

## Gate to Phase 2

The whole team can run the same development environment and CI is green.

---

# Phase 2 — Shared Contracts, Assessment Definitions, Scoring, (clinical knowledge and rules)

This phase establishes the shared clinical and technical foundation of WEMA before user interfaces or backend endpoints are developed. Rather than embedding questionnaires, scoring logic, and clinical decisions directly inside the frontend or backend, these are implemented as reusable shared packages. This ensures that the Patient App, Psychologist Portal, API, worker, and test suites all use the same definitions for patients, assessments, scores, classifications, and routing decisions.

The purpose is to separate clinical knowledge from interface and infrastructure code. By defining EPDS, PHQ-2, PHQ-9, scoring functions, continuation rules, safety rules, and routing logic centrally, WEMA gains one approved source of truth. This makes the system safer and easier to test because every clinical decision can be versioned, reviewed, traced, and verified through golden test cases before any screen or endpoint depends on it.

## Objective

Implement the shared clinical and data foundations before building screens or API endpoints.

## Detailed Activities

### Contracts

Create shared Zod schemas and inferred TypeScript types for patients, consent, screening sessions, assessments, answers, routing, queue, assignments, consultations, scheduling, devices, sync payloads, worker jobs, Wonder payloads, and WhatsApp alerts.

### Assessment Tools

Create versioned EPDS, PHQ-2, and PHQ-9 definitions containing stable IDs, question IDs, answer-option IDs, score values, translation keys, content references, and versions.

### Scoring

Implement pure functions:

```text
scoreEPDS()
scorePHQ2()
scorePHQ9()
```

### Clinical Rules

Implement EPDS classification and routing, PHQ-2 continuation, PHQ classification and routing, safety invariants, and rule versions.

## Deliverables

- Contracts package.
- Assessment-tools package.
- Scoring package.
- Clinical-rules package.
- Clinical golden test cases.
- Clinical approval register.

## Acceptance Criteria

- Clinical Lead approves assessment definitions.
- All scoring golden cases pass.
- Threshold boundaries are tested.
- PHQ-2 continuation logic is approved.
- Patient App and API import the same contracts.

## Gate to Phase 3

Clinical logic is approved, versioned, tested, and reusable.

---

# Phase 3 — PostgreSQL Data Model, Audit Foundation, and Seed Data

This phase creates the permanent server-side structure that stores WEMA's operational and clinical records. The team defines database tables for patients, assessments, consent, psychologists, rooms, queues, consultations, appointments, synchronization events, notifications, and audit logs. Prisma migrations, repositories, transactions, and sample development data are also created so the backend can work with the database in a controlled and consistent manner.

This phase follows the clinical foundation because the data model must reflect the approved workflow and shared contracts. If the database is designed before the clinical and workflow requirements are clear, it may store the wrong information or require disruptive changes later. The audit foundation is especially important because WEMA must be able to show who performed an action, when it happened, which rule version was used, and how a patient moved through the system.

## Objective

Implement the server-side data model and audit foundation.

## Core Entities

| Entity | Purpose |
|---|---|
| `users` | Authenticated staff accounts |
| `roles` | Role definitions |
| `psychologists` | Psychologist profile and facility assignment |
| `facilities` | Facility configuration |
| `devices` | Registered tablets |
| `patients` | Wonder-linked or WEMA-owned patient records |
| `consents` | Versioned consent |
| `screening_sessions` | Screening encounter |
| `assessments` | EPDS, PHQ-2, or PHQ-9 result |
| `assessment_answers` | Tool-independent answers |
| `routing_decisions` | Clinical routing result |
| `psychologist_availability` | Availability history |
| `rooms` | Consultation rooms |
| `room_assignments` | Patient/psychologist/room allocation |
| `queues` | Facility queue |
| `queue_entries` | Waiting entries |
| `consultations` | Consultation lifecycle |
| `appointments` | General Public follow-up scheduling |
| `notification_requests` | General Public alert request |
| `integration_events` | Wonder/WhatsApp attempts |
| `sync_transactions` | Sync batch outcomes |
| `audit_logs` | Sensitive action history |

## Detailed Activities

- Create Prisma schema and migrations.
- Add repositories and transactions.
- Write audit records transactionally with clinical changes.
- Seed facilities, rooms, users, psychologists, devices, and synthetic patients.
- Document data ownership and ER diagram.

## Acceptance Criteria

- Schema supports all three tools without tool-specific tables.
- Wonder-linked and WEMA-owned patients are distinguishable.
- Clinically significant writes create audit records.
- Seeded development environment works.

## Gate to Phase 4


Database, repositories, and audit foundation are approved.

---

# Phase 4 — Backend API Foundation, Authentication, Device Registration, and Health

This phase builds the secure server foundation used by both frontend applications and the background worker. The Express application is configured with routes, validation, logging, error handling, authentication, authorization, device registration, environment validation, and health endpoints. Psychologists receive authenticated accounts, while patient tablets are recognized through device credentials rather than patient login accounts.

This work must be completed before the Patient App and Psychologist Portal begin exchanging real data with the server. The backend is the controlled entry point into WEMA's central records, so it must reject invalid requests, unauthorized users, revoked tablets, and malformed payloads. Health checks and structured error handling are also added early so developers and operators can immediately see whether the API, database, and related services are functioning correctly.

## Objective

Create the secure backend foundation used by the Patient App, Portal, and Worker.

## Detailed Activities

- Create Express app, server, routes, startup, and shutdown.
- Add request IDs, logging, validation, and centralized error handling.
- Implement psychologist login and authorization.
- Implement device registration, credentials, revocation, and rotation.
- Add `/health` and `/health/deep`.
- Add environment validation and redaction rules.

## Acceptance Criteria

- Psychologist can authenticate.
- Tablet authenticates with device credentials.
- Patients do not need accounts.
- Invalid payloads are rejected safely.
- Health checks work.

## Gate to Phase 5

API foundation and authentication are ready.

---

# Phase 5 — Patient App Shell, Workflow Entry, Languages, Consent, and Session Reset

This phase builds the common outer structure of the Patient App before the EPDS and PHQ screens are added. It includes application startup, IndexedDB initialization, device identity loading, Service Worker registration, workflow selection, language selection, versioned consent, shared layouts, error handling, and session reset. These capabilities are used by both the EPDS–Wonder workflow and the General Public PHQ workflow.

The purpose is to avoid building the same startup, language, consent, and privacy behavior separately for each screening tool. Both workflows need a reliable application shell that knows which workflow belongs to the device, which language the patient selected, whether consent was recorded, and when the previous patient's session should be cleared. Building these shared capabilities first reduces duplication and ensures privacy protections are in place before patient-specific screens are introduced.

## Objective

Build the shared Patient App experience before assessment-specific screens.

## Detailed Activities

- Implement startup flow.
- Register Service Worker.
- Open IndexedDB.
- Load device identity and workflow configuration.
- Route the device to EPDS or General Public workflow.
- Implement English, Kiswahili, and Luo selection.
- Implement versioned consent.
- Implement session reset that protects pending outbox data.
- Add error boundary and shared layouts.

## Acceptance Criteria

- Correct workflow opens for the device.
- Language and consent work offline.
- Consent is versioned and stored.
- Session reset removes previous-patient UI state without deleting unsynced records.

## Gate to Phase 6

Common Patient App shell works online and offline.

---

# Phase 6 — Local-First Infrastructure: IndexedDB, Repositories, Outbox, Sync, and Service Worker

This phase implements the core offline-first engine of the Patient App. It creates the local IndexedDB schema, local repositories, durable outbox, synchronization services, retry rules, connectivity detection, Service Worker caching, and local status tracking. After this phase, the tablet can create and preserve complete patient and assessment records without depending on a live network connection.

This is one of WEMA's most important phases because unreliable connectivity must not interrupt screening or cause patient data loss. The tablet saves records locally first and later synchronizes them with the backend when connectivity returns. By proving the local-first behavior before implementing full clinical workflows, the team avoids building screens that appear to work online but fail when deployed in the actual hospital environment.

## Objective

Implement the complete local-first foundation.

## Local Tables

```text
patients
consents
screeningSessions
assessmentAnswers
assessments
routingDecisions
resourceSnapshots
queueEntries
assignments
outbox
syncState
contentVersions
deviceConfiguration
```

## Required Local Outbox Jobs

```text
SYNC_WEMA_PATIENT
SYNC_SCREENING_SESSION
SYNC_ASSESSMENT
SYNC_ROUTING_DECISION
SYNC_QUEUE_ENTRY
SYNC_ASSIGNMENT
SYNC_AUDIT_EVENT
```

## Required Pull Tasks

```text
REFRESH_WONDER_PATIENT_CACHE
REFRESH_RESOURCE_SNAPSHOT
REFRESH_CONTENT_MANIFEST
```

## Detailed Activities

- Implement Dexie schema and migrations.
- Add local repositories.
- Add durable outbox with idempotency keys and retry status.
- Add push and pull sync services.
- Add connectivity checks using browser state plus backend health.
- Add Service Worker caching.
- Add staff-visible sync status.

## Acceptance Criteria

- Full offline record can be created.
- Record syncs after reconnection.
- Duplicate retry does not duplicate server data.
- Failed syncs are visible.
- Data survives refresh and restart.

## Gate to Phase 7

Local-first foundation is proven with stubbed records.

---

# Phase 7 — EPDS–Wonder Patient Identification and Screening Workflow

This phase implements the first complete patient workflow: maternal mental health screening using EPDS with Wonder integration. The tablet receives the Wonder patient cache, allows local search and patient verification, supports fallback WEMA registration, presents all EPDS questions, saves answers progressively, calculates the score locally, applies clinical rules, displays the approved result, and creates synchronization records.

EPDS is implemented first because it is the integrated clinical pathway and contains the most important dependencies, including Wonder patient identity and eventual Wonder result delivery. Completing this workflow proves that the shared contracts, clinical packages, local database, device configuration, and application shell can work together in a real patient journey. It also gives the clinical team a complete workflow to validate before the second pathway is added.

## Objective

Implement the complete EPDS patient journey.

## Detailed Activities

- Refresh Wonder patient cache in the backend.
- Pull the cache to the tablet.
- Implement local patient search and verification.
- Implement fallback WEMA registration without blocking screening.
- Implement all 10 EPDS questions.
- Save answers progressively.
- Score and classify locally.
- Display approved result and create routing input.
- Store tool, scoring, rule, and content versions.
- Create outbox records.

## Acceptance Criteria

- Matched and fallback patient flows work offline.
- EPDS scoring matches clinical golden cases.
- Partial sessions recover after refresh/restart.
- Result is queued for synchronization.

## Gate to Phase 8

EPDS is complete and produces a valid routing decision.

---

# Phase 8 — General Public Registration and PHQ-2 → PHQ-9 Workflow

This phase implements the General Public pathway owned entirely by WEMA. Patients who are not part of the Wonder maternal workflow are registered in WEMA, complete PHQ-2, and continue to PHQ-9 only when the approved continuation rule is met. The system stores both assessments within the same screening session, calculates and classifies the result locally, displays approved messages, and creates routing or alert requests where required.

This workflow is developed after EPDS so the team can reuse the established screening runner, local storage, language, consent, scoring, routing, and synchronization foundations. However, its data ownership remains separate: PHQ records are stored in WEMA and must never be sent to Wonder. Keeping this separation explicit prevents accidental integration errors while still allowing both workflows to use the same underlying platform.

## Objective

Implement the complete WEMA-owned General Public flow.

## Detailed Activities

- Implement approved minimum registration fields.
- Implement PHQ-2 questions and local scoring.
- Apply continuation rule.
- Continue to PHQ-9 only when required.
- Store linked PHQ-2 and PHQ-9 results in one screening session.
- Display approved result.
- Create routing and alert requests where required.
- Ensure no PHQ data is sent to Wonder.

## Acceptance Criteria

- General Public registration works offline.
- PHQ-2 continuation is correct.
- PHQ-9 appears only when required.
- PHQ data remains in WEMA.
- High-risk General Public cases create an alert request.

## Gate to Phase 9

Both screening workflows are complete.

---

# Phase 9 — Availability, Rooms, Routing, Queue, Assignment, and Psychoeducation

This phase implements what happens after a patient receives a screening result. WEMA begins tracking psychologist shifts, availability, consultation rooms, waiting queues, patient assignments, estimated wait times, and psychoeducation content. The tablet uses the latest available resource snapshot to make a provisional routing decision, while the backend remains responsible for the authoritative queue and room assignment.

Screening alone does not complete a safe clinical workflow. A patient with an elevated or high-risk result must reach a valid next state, such as an available psychologist, a waiting queue, or a supported waiting experience. This phase therefore turns clinical classification into real operational action and prevents situations where WEMA identifies a need but provides no clear pathway for the patient to receive support.

## Objective

Implement operational patient routing for both workflows.

## Detailed Activities

- Implement psychologist availability and shift state.
- Implement room state.
- Implement resource snapshot pull to tablets.
- Implement routing based on workflow, classification, safety rules, and local snapshot.
- Implement local provisional queue entry.
- Implement authoritative server queue.
- Implement transactional room assignment.
- Implement conflict reconciliation.
- Implement queue position and estimated wait.
- Implement psychoeducation while waiting.

## Acceptance Criteria

- Every route ends in a valid state.
- Server prevents double-booking.
- Queue order is deterministic.
- Offline provisional decisions reconcile safely.
- Queue state survives restart.

## Gate to Phase 10

Routing and queueing are clinically approved.

---

# Phase 10 — Psychologist Portal Design and Implementation

This phase designs and builds the secure operational interface used by psychologists. The portal includes login, shift management, availability, room selection, queue viewing, patient assignments, consultation start and completion, and General Public follow-up scheduling. Because the patient application designs are already approved but the psychologist interface is not, UI/UX work and implementation are both required in this phase.

The portal is built after the queue and routing services because it needs real operational data and actions to display. Psychologists must be able to update availability and room status, receive assigned patients, move consultations through their lifecycle, and schedule appropriate follow-up. This phase connects the patient-side workflow to the healthcare professional who must act on the result.

## Objective

Design and build the psychologist operational interface.

## Included MVP1 Features

| Feature | Included |
|---|---|
| Login/logout | Yes |
| Shift start/end | Yes |
| Availability | Yes |
| Rooms | Yes |
| Queue | Yes |
| Assignments | Yes |
| Consultation start/complete | Yes |
| General Public scheduling | Yes |
| Advanced dashboard/reporting | No |
| Admin Portal | No |

## Detailed Activities

- Design all portal screens and states.
- Implement protected routes and session handling.
- Implement availability and room updates.
- Implement polling-based queue refresh.
- Implement assignment details.
- Implement consultation lifecycle.
- Implement General Public follow-up scheduling.

## Acceptance Criteria

- Psychologist can log in, start shift, set availability, select room, view queue, start/complete consultation, and schedule follow-up.
- Portal changes are reflected in Patient App resource snapshots.
- Facility representatives approve the flow.

## Gate to Phase 11

End-to-end patient-to-psychologist journey works.

---

# Phase 11 — Synchronization API and Server-Side Reconciliation

This phase turns the basic offline synchronization mechanism into a complete and reliable protocol between the tablet and backend. The API accepts batched pushes, returns per-item success or failure, supports cursor-based pulls, validates device and workflow details, handles duplicate retries through idempotency, and records synchronization transactions. Conflict policies are implemented for cases where local and server records disagree.

This phase is necessary because real-world synchronization is more complex than simply sending data when the internet returns. A network can disconnect halfway through a batch, a tablet can retry the same record, or local availability information can become outdated. Server-side reconciliation ensures that these situations do not create duplicate assessments, lost queue entries, conflicting room assignments, or unclear synchronization states

## Objective

Implement reliable tablet-to-server synchronization.

## Push Data

- WEMA patients;
- consent;
- screening sessions;
- assessments;
- routing decisions;
- queue entries;
- assignments;
- audit events.

## Pull Data

- Wonder patient cache;
- facility/device configuration;
- resource snapshots;
- queue/assignment status;
- content manifest;
- active tool/rule versions.

## Detailed Activities

- Implement versioned sync envelope.
- Validate device, workflow, schema, and idempotency.
- Return per-item success/failure.
- Support cursor/version-based pull.
- Implement conflict policies.
- Record sync transactions and correlation IDs.

## Acceptance Criteria

- Retry does not duplicate records.
- Partial batch failure is safe.
- Conflicts follow documented rules.
- Errors are actionable and traceable.

## Gate to Phase 12

Synchronization is reliable under interruption, retry, and conflict.

---

# Phase 12 — Wonder Integration for EPDS

This phase completes the actual connection between WEMA and Wonder for the maternal EPDS workflow. The team implements Wonder authentication, patient retrieval, patient mapping, EPDS result mapping, background refresh jobs, result-push jobs, retries, idempotency, error classification, and integration-event tracking. Contract and sandbox tests are used to confirm that WEMA sends and receives the agreed data formats.

Wonder integration is deliberately implemented after the internal EPDS workflow and synchronization protocol are stable. WEMA should first prove that it can safely collect, store, classify, and synchronize an assessment internally before relying on an external system. This separation also allows development to continue with mocks when Wonder access is delayed and ensures that Wonder-specific failures do not cause loss of the original WEMA record.

## Objective

Complete EPDS data exchange with Wonder.

## Worker Jobs

```text
REFRESH_WONDER_PATIENTS
PUSH_EPDS_TO_WONDER
```

## Detailed Activities

- Implement Wonder authentication and client.
- Implement patient mapper.
- Implement EPDS result mapper.
- Implement refresh job.
- Implement EPDS push job.
- Add retry and idempotency.
- Record every integration attempt.
- Add `REQUIRES_REVIEW` for non-retryable patient/reference errors.
- Add contract and sandbox tests.

## Acceptance Criteria

- Offline EPDS eventually reaches Wonder.
- Duplicate retries do not create duplicate Wonder records.
- Every attempt is traceable.
- PHQ data is blocked from the adapter.

## Gate to Phase 13

Wonder sandbox end-to-end EPDS flow passes.

---

# Phase 13 — General Public WhatsApp Alerting

This phase implements WEMA-managed WhatsApp alerts for approved high-risk cases in the General Public workflow only. The backend creates an idempotent notification request, validates the workflow, prepares the minimum approved message, sends it through the selected provider, records the response, retries temporary failures, and exposes unsuccessful alerts for operational follow-up.

This phase is separate from the clinical routing rules because deciding that an alert is required and actually delivering an external message are different responsibilities. The separation also protects the strict workflow boundary: EPDS cases must never enter the General Public WhatsApp pathway. By adding workflow validation, minimal-data messaging, retry behavior, and delivery records, the system can alert responsibly without duplicating messages or exposing unnecessary patient information.

## Objective

Implement WEMA-managed alerts only for approved General Public high-risk cases.

## Worker Job

```text
SEND_GENERAL_PUBLIC_WHATSAPP_ALERT
```

## Detailed Activities

- Create idempotent notification request.
- Validate workflow before sending.
- Build approved minimum-content message.
- Send through provider.
- Record provider response.
- Retry transient failures.
- Expose failed status operationally.
- Redact sensitive alert data from logs.

## Acceptance Criteria

- Approved General Public alert is delivered.
- Duplicate alert is prevented.
- Failed alert is visible and retryable.
- EPDS never enters this path.

## Gate to Phase 14

General Public alerting is verified end to end.

---

# Phase 14 — Multilingual Content, Audio, Psychoeducation, and Accessibility Validation

This phase finalizes all patient-facing content across English, Kiswahili, and Luo. The team validates translations, maps audio files to questions and guidance, tests psychoeducation videos offline, defines missing-media fallbacks, and checks touch targets, text size, contrast, non-colour indicators, loading states, error states, and interrupted-session behavior. Clinical reviewers confirm meaning, while language reviewers confirm accuracy and cultural appropriateness.

This work is completed after the workflows and screens exist because content must be tested in its real context rather than only inside translation files. A sentence can be technically translated but still be confusing, culturally inappropriate, or clinically inaccurate when displayed during screening. Accessibility and media validation also ensure that WEMA remains usable for patients with different literacy levels, language preferences, abilities, and levels of digital experience.

## Objective

Finalize patient-facing content and accessibility.

## Detailed Activities

- Validate all text in English, Kiswahili, and Luo.
- Validate clinical meaning, not only literal translation.
- Map question audio.
- Test play/pause/replay and missing-audio fallback.
- Validate psychoeducation content and offline playback.
- Validate touch targets, font size, contrast, and non-color risk indicators.
- Define loading, empty, offline, retry, error, and interrupted-session states for every screen.

## Acceptance Criteria

- Language reviewers sign off.
- Clinical Lead signs off wording.
- Critical content works offline.
- Accessibility checklist passes.
- Every screen has safe fallback states.

## Gate to Phase 15

Content, language, media, and accessibility are approved.

---

# Phase 15 — Observability, Security, Privacy, and Clinical Safety Hardening

This phase prepares WEMA for formal acceptance by strengthening how the system is monitored, protected, and operated. Structured logging, correlation IDs, metrics, error monitoring, data redaction, role-based access, credential security, backup controls, privacy rules, retention rules, and threat modelling are implemented or reviewed. The team also tests clinical safety invariants to prove that no significant patient case can silently disappear or enter the wrong workflow.

These safeguards are applied after the main functionality exists because the team can now review the real data flows, failure paths, integrations, and user actions. The goal is not simply to make WEMA functional but to make failures visible, sensitive information protected, and risky actions controlled. In a healthcare system, an invisible synchronization error or misrouted high-risk case can be more dangerous than an obvious software crash.

## Objective

Harden WEMA before formal acceptance testing.

## Detailed Activities

### Observability

- Structured logs.
- Correlation IDs.
- Redaction.
- Error monitoring.
- Health checks.
- Metrics for sync, Wonder, WhatsApp, worker queue, and API failures.

### Security

- TLS.
- Password hashing.
- JWT and device credential handling.
- RBAC.
- Secret management.
- Dependency scanning.
- Backup access controls.

### Privacy

- Minimum necessary data.
- Consent versioning.
- Local/server retention rules.
- Lost/replaced tablet process.
- Log redaction.

### Clinical Safety

Prove that no path silently loses a clinically significant case, sends PHQ to Wonder, sends EPDS through General Public WhatsApp, duplicates intervention, or finalizes an invalid room assignment.

## Deliverables

- Security review.
- Privacy review.
- Clinical safety review.
- Threat model.
- Observability configuration.
- Runbooks.

## Acceptance Criteria

- No release-blocking security issue.
- No identified silent-loss path.
- Sensitive data is redacted.
- Failures are visible.
- Runbooks are usable.

## Gate to Phase 16

Security, privacy, observability, and clinical safety are signed off.

---

# Phase 16 — Full QA, Integration Testing, Clinical Validation, and UAT

This phase validates the complete MVP1 across unit tests, frontend components, APIs, databases, offline recovery, synchronization, conflicts, Wonder, WhatsApp, portal operations, content, security, performance, clinical rules, and user acceptance. Testing is carried out on staging and on the actual target tablet hardware. Facility representatives and clinical reviewers use realistic workflows to confirm that the system behaves safely and practically.

Although testing begins in earlier phases, this is the point where the whole system is evaluated as one connected product. A scoring function may pass its own tests while the complete patient journey still fails because of routing, synchronization, device, or portal problems. Phase 16 ensures that all the independently developed parts work together and that no release-blocking defect remains before production.

## Objective

Validate the complete MVP1 on staging and real target hardware.

## Test Matrix

| Test area | Required scenarios |
|---|---|
| Unit | Scoring, continuation, classification, routing |
| Component | Patient and portal components |
| API | Every endpoint and validation path |
| Database | Repositories, transactions, migrations |
| Offline | Full EPDS and PHQ flows without network |
| Recovery | Refresh, app close, tablet restart |
| Sync | Push, pull, retry, duplicate, partial failure |
| Conflict | Queue and room conflicts |
| Wonder | Patient refresh and EPDS push |
| WhatsApp | General Public alert |
| Portal | Login, availability, room, queue, consultation, scheduling |
| Content | Three languages, audio, psychoeducation |
| Security | Authentication, authorization, redaction |
| Performance | Target tablet and expected facility volume |
| Clinical | Approved scoring and routing cases |
| UAT | Facility staff operating the real workflow |

## Release-Blocking Defects

- incorrect score or classification;
- lost assessment;
- duplicate clinical action;
- high-priority patient lost from route/queue;
- wrong patient association;
- PHQ sent to Wonder;
- EPDS sent through General Public WhatsApp;
- unauthorized clinical access;
- unrecoverable offline data;
- Wonder failure hidden from staff.

## Acceptance Criteria

- No open release-blocking defect.
- Clinical sign-off complete.
- Facility UAT sign-off complete.
- Regression passes.
- Offline tests pass on real tablet hardware.

## Gate to Phase 17

Release candidate is approved.

---

# Phase 17 — Production Deployment and Go-Live

This phase moves the approved release from staging into the live production environment. The team configures the production database, API, worker, queue, frontend hosting, TLS, secrets, backups, monitoring, and deployment settings. Database migrations are applied, tagged application versions are deployed, controlled smoke tests are performed, and facility devices are activated gradually with a rollback plan ready.

Production deployment is treated as a controlled phase rather than a simple upload because WEMA includes clinical workflows, offline devices, external integrations, and sensitive data. Smoke tests confirm that the Patient App, Psychologist Portal, Wonder integration, WhatsApp alerting, health checks, and monitoring all work in the real environment. Gradual activation and hypercare reduce the impact of unexpected production issues.

## Objective

Deploy WEMA safely and verify production operation.

## Detailed Activities

- Finalize production database, API, Worker, queue, frontend hosting, Nginx, TLS, secrets, backups, and monitoring.
- Back up and restore-test the database.
- Deploy tagged release.
- Run migrations.
- Deploy backend and worker.
- Deploy frontends.
- Run production smoke tests.
- Activate facility devices in a controlled sequence.
- Start hypercare.

## Production Smoke Tests

- Patient App startup.
- Device authentication.
- EPDS flow.
- General Public flow.
- Portal login.
- Availability and queue.
- Controlled Wonder push.
- Controlled General Public WhatsApp alert.
- Health and monitoring alerts.

## Acceptance Criteria

- Smoke tests pass.
- Monitoring works.
- Backup restore is proven.
- Rollback procedure is ready.
- Facility activation is approved.

## Gate to Phase 18

WEMA is live and stable through the first hypercare checkpoint.

---

# Phase 18 — Training, Handover, Support, and MVP1 Closure

This phase transfers the completed WEMA system from the development project into normal operational use. Psychologists, facility staff, IT support personnel, supervisors, and technical administrators are trained according to their responsibilities. The team hands over source code, deployment procedures, monitoring, backups, runbooks, integration information, support contacts, known limitations, and the approved MVP2 backlog.

The project is not complete simply because the software is live. The people operating and supporting WEMA must know how to use it, recognize failures, recover from common incidents, and escalate serious problems. Formal closure confirms that the contracted MVP1 scope has been delivered, excluded features remain excluded, ownership has been transferred, and all stakeholders understand what will be handled in later phases or MVP2.

## Objective

Transfer WEMA into steady-state operational use.

## Detailed Activities

- Train psychologists, facility IT, supervisors, and support staff.
- Handover repository, environments, deployment, monitoring, backup, Wonder, WhatsApp, and runbooks.
- Define support severity and escalation.
- Record known issues and deferred scope.
- Prepare MVP2 backlog.

## MVP1 Closure Checklist

- [ ] EPDS–Wonder implemented.
- [ ] PHQ-2 → PHQ-9 implemented.
- [ ] Patient App works offline.
- [ ] Psychologist Portal works.
- [ ] Rooms, queue, assignments, and consultations work.
- [ ] General Public scheduling works.
- [ ] EPDS reaches Wonder.
- [ ] General Public WhatsApp alert works.
- [ ] English, Kiswahili, and Luo content approved.
- [ ] Monitoring and support ownership transferred.
- [ ] No Admin Portal.
- [ ] No CHP tasking.
- [ ] No WEMA SMS workflow.
- [ ] No PCL or DAST.
- [ ] No advanced dashboard/reporting in MVP1.

## Acceptance Criteria

- Operational team can use the system.
- Technical support can follow runbooks.
- Known limitations are accepted.
- MVP1 closure is signed.

---

# 4. Milestone Summary

| Milestone | Phase | Evidence |
|---|---|---|
| M0 — Scope confirmed | Phase 0 | Approved scope and decisions |
| M1 — Engineering foundation ready | Phase 1 | Green CI and reproducible setup |
| M2 — Clinical logic approved | Phase 2 | Golden tests and approval |
| M3 — Data foundation ready | Phase 3 | Schema and audit evidence |
| M4 — Secure API foundation ready | Phase 4 | Auth/device/health tests |
| M5 — Patient shell ready | Phase 5 | Workflow entry and consent demo |
| M6 — Offline foundation proven | Phase 6 | Airplane-mode recovery demo |
| M7 — EPDS workflow complete | Phase 7 | Complete EPDS demo |
| M8 — PHQ workflow complete | Phase 8 | PHQ-2/PHQ-9 demo |
| M9 — Routing and queue safe | Phase 9 | Conflict and recovery evidence |
| M10 — Portal functional | Phase 10 | Consultation demo |
| M11 — Sync reliable | Phase 11 | Retry/idempotency tests |
| M12 — Wonder verified | Phase 12 | Sandbox EPDS push |
| M13 — WhatsApp verified | Phase 13 | General Public alert evidence |
| M14 — Content validated | Phase 14 | Language/accessibility sign-offs |
| M15 — System hardened | Phase 15 | Security/safety sign-offs |
| M16 — Acceptance complete | Phase 16 | QA, clinical, UAT approval |
| M17 — Production live | Phase 17 | Production smoke tests |
| M18 — Handover complete | Phase 18 | Signed closure |

---

# 5. Recommended Sprint Grouping

| Sprint | Main phases |
|---|---|
| Pre-sprint | Phase 0 |
| Sprint 1 | Phase 1 |
| Sprint 2 | Phases 2–3 |
| Sprint 3 | Phases 4–5 |
| Sprint 4 | Phase 6 |
| Sprint 5 | Phase 7 |
| Sprint 6 | Phase 8 |
| Sprint 7 | Phase 9 |
| Sprint 8 | Phase 10 |
| Sprint 9 | Phase 11 |
| Sprint 10 | Phases 12–13 |
| Sprint 11 | Phase 14 |
| Sprint 12 | Phase 15 |
| Sprint 13 | Phase 16 |
| Sprint 14 | Phase 17 |
| Sprint 15 | Phase 18 |

Important overlaps:

- Psychologist Portal design can begin during Phases 7–9.
- Translation review can begin before all screens are complete.
- Wonder adapter mocks can begin before sandbox access.
- Staging infrastructure can begin before formal QA.
- QA test design begins in Phase 1, not Phase 16.

---

# 6. Definition of Ready

A task is ready only when:

- the user story is clear;
- acceptance criteria exist;
- workflow ownership is known;
- design exists for UI work;
- clinical wording has a reviewed draft;
- required contract/schema exists;
- external dependency is available or mocked;
- test scenarios are identified.

---

# 7. Definition of Done

A task is done only when:

- code is merged through review;
- CI passes;
- tests are included;
- acceptance criteria are verified;
- error and offline behavior are implemented;
- logging is safe;
- audit behavior exists where required;
- documentation is updated;
- clinical approval is recorded where required;
- no excluded MVP feature was introduced.

---

# 8. Requirements Traceability

Use:

```text
Requirement
→ User Story
→ Technical Task
→ Pull Request
→ Test Case
→ Acceptance Evidence
→ Sign-off
→ Release
```

Recommended fields:

| Field | Example |
|---|---|
| Requirement ID | WEMA-MVP1-EPDS-01 |
| Workflow | EPDS–Wonder |
| Requirement | Patient can complete EPDS offline |
| User story | US-EPDS-04 |
| Technical tasks | FE-112, BE-087 |
| Pull requests | PR-145, PR-149 |
| Test cases | OFF-EPDS-01, SYNC-EPDS-02 |
| Evidence | Test run or screenshot |
| Clinical sign-off | Name/date |
| Release | v1.0.0 |

---

# 9. Top Project Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Wonder access delayed | Medium | High | Mock contract and early escalation | Technical PM + Wonder Team |
| Clinical reviewer unavailable | Medium | High | Book phase-gate reviews early | Technical PM |
| Kiswahili/Luo content delayed | Medium | Medium | English-first but fully key-based | Technical PM |
| Tablet performance issues | Medium | High | Test real hardware from Phase 6 | QA |
| Scope creep | High | High | Approved scope and change control | Technical PM |
| Incorrect clinical rules | Low | Critical | Golden cases and clinical sign-off | Clinical Lead |
| Offline data loss | Medium | Critical | Progressive saves and recovery tests | Frontend + QA |
| Duplicate Wonder submission | Medium | High | Idempotency and integration events | Backend |
| Patient privacy exposure | Medium | Critical | Redaction, reset tests, device controls | Architect + QA |
| Alert failure | Medium | High | Retry, visibility, runbook | Backend + DevOps |
| Room double-booking | Medium | High | Server transaction | Backend |
| Dashboard scope expansion | Medium | Medium | Defer analytics to MVP2 | Technical PM |

---

# 10. Final Scope Protection Checklist

Before approving MVP1 release, confirm:

- [ ] EPDS workflow uses Wonder patient data where available.
- [ ] EPDS results push to Wonder.
- [ ] General Public workflow uses PHQ-2 and PHQ-9 only.
- [ ] General Public PHQ data is not pushed to Wonder.
- [ ] WEMA WhatsApp alerts apply only to General Public high-risk cases.
- [ ] Psychologist availability, rooms, queue, assignments, and consultations work.
- [ ] General Public follow-up scheduling works.
- [ ] Patient App works offline.
- [ ] Sync failures are visible.
- [ ] No Admin Portal exists.
- [ ] No advanced dashboard/reporting exists.
- [ ] No CHP task exists.
- [ ] No WEMA SMS workflow exists.
- [ ] No PCL or DAST implementation exists.
- [ ] Clinical scoring and routing versions are stored.
- [ ] Consent is versioned and auditable.
- [ ] Production monitoring and support ownership are defined.
