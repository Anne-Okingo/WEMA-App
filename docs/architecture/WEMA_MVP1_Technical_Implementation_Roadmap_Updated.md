# WEMA MVP1 Technical Implementation Roadmap

## Dual-Workflow, Offline-First Architecture

**Workflows included in MVP1**

1. **Maternal Mental Health Workflow** — EPDS, integrated with Wonder HMIS.
2. **General Public Mental Health Workflow** — PHQ-2 followed by PHQ-9 when triggered, stored and managed entirely in WEMA.

**Document status:** Updated implementation reference  
**Architecture style:** One WEMA platform, two patient workflows, one psychologist portal, one backend, one PostgreSQL database  
**Patient access model:** Different frontend routes identify the workflow before the screening session begins  
**Psychologist access model:** Authenticated clinical operations portal  
**Admin portal:** Not included in MVP1

---

# 1. Purpose

This document defines how the WEMA MVP1 platform will be implemented as one system supporting two separate screening workflows.

The two workflows share:

- one patient application;
- one psychologist portal;
- one backend API;
- one PostgreSQL database;
- one local-first synchronization framework;
- one availability service;
- one room-management service;
- one routing service;
- one queue service;
- one scheduling service;
- one audit framework;
- one multilingual content framework.

They differ in:

- how patients enter the system;
- where patient identity comes from;
- which screening tool is used;
- where the final screening record is stored;
- which system sends a high-risk WhatsApp alert;
- which system owns follow-up and reporting.

---

# 2. Final Architectural Decision

## 2.1 One application, different entry routes

The patient does not choose a technical screening tool.

The URL or frontend route determines which workflow opens.

```text
https://wema.health/screening/epds
https://wema.health/screening/public
https://wema.health/psychologist
```

| Route | User experience | Workflow |
|---|---|---|
| `/screening/epds` | Maternal mental-health self-screening | EPDS + Wonder |
| `/screening/public` | General public self-screening | PHQ-2 → PHQ-9 |
| `/psychologist` | Authenticated clinical operations portal | Shared operational portal |

The route determines the initial interface, but the backend validates and persists the trusted workflow type for every session.

## 2.2 Route responsibility

```text
URL route
   ↓
Frontend workflow configuration
   ↓
Create screening session
   ↓
Backend validates workflow
   ↓
Trusted workflow context stored
   ↓
All later decisions use the stored session context
```

The system must not rely on the URL alone after session creation.

Every screening session stores:

```ts
type WorkflowType =
  | "EPDS_WONDER"
  | "GENERAL_PUBLIC_PHQ";
```

A trusted session also includes:

```ts
interface ScreeningSessionContext {
  id: string;
  workflowType: WorkflowType;
  patientSource: "WONDER" | "WEMA";
  integrationTarget: "WONDER" | "WEMA_ONLY";
  alertOwner: "WONDER" | "WEMA";
  facilityId: string;
  deviceId: string;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "SYNC_PENDING" | "SYNCED";
}
```

---

# 3. Whole-System Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                              WEMA PLATFORM                                   │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND ENTRY ROUTER                                │
│                                                                              │
│ /screening/epds       → EPDS patient workflow                               │
│ /screening/public     → General Public PHQ workflow                         │
│ /psychologist         → Psychologist portal                                 │
└───────────────┬───────────────────────┬───────────────────────┬──────────────┘
                │                       │                       │
                ▼                       ▼                       ▼
┌──────────────────────────┐ ┌──────────────────────────┐ ┌───────────────────┐
│ EPDS PATIENT INTERFACE   │ │ PUBLIC PATIENT INTERFACE │ │ PSYCHOLOGIST      │
│                          │ │                          │ │ PORTAL            │
│ Patient source: Wonder   │ │ Patient source: WEMA     │ │ Requires login    │
│ Tool: EPDS               │ │ Tool: PHQ-2 → PHQ-9      │ │                   │
│ Result target: Wonder    │ │ Result target: WEMA      │ │ Availability      │
│ Alert owner: Wonder      │ │ Alert owner: WEMA        │ │ Rooms             │
│                          │ │                          │ │ Queue             │
│ Wonder patient list      │ │ Public registration      │ │ Scheduling        │
│ Local EPDS               │ │ Local PHQ scoring        │ │ Consultations     │
└──────────────┬───────────┘ └──────────────┬───────────┘ └─────────┬─────────┘
               │                            │                       │
               └────────────────────────────┼───────────────────────┘
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                       SHARED WEMA APPLICATION SERVICES                      │
│                                                                              │
│ Language • Consent • Audio • Avatar • Media • Accessibility                 │
│ Sessions • Scoring • Risk Classification • Routing • Results               │
│ Availability • Rooms • Assignments • Queue • Scheduling                    │
│ Local Database • Outbox • Synchronization • Audit                          │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     LOCAL-FIRST DEVICE INFRASTRUCTURE                       │
│                                                                              │
│ IndexedDB / Dexie                                                           │
│ Service Worker / Workbox                                                    │
│ Cached app shell and content                                                │
│ Local patient and assessment records                                        │
│ Outbox and retry queue                                                       │
│ Crash recovery and resume                                                    │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
                         Sync whenever connected
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           WEMA BACKEND API                                  │
│                                                                              │
│ Authentication • Devices • Facilities • Patients • Sessions                │
│ Assessments • Workflow orchestration • Routing • Availability              │
│ Rooms • Assignments • Queue • Scheduling • Consultations                   │
│ Notifications • Dashboard • Reports • Synchronization • Audit              │
└──────────────────────┬─────────────────────────────┬─────────────────────────┘
                       │                             │
                       ▼                             ▼
┌────────────────────────────────────┐  ┌─────────────────────────────────────┐
│ EPDS INTEGRATION PATH              │  │ GENERAL PUBLIC DATA PATH            │
│                                    │  │                                     │
│ Wonder Adapter                     │  │ WEMA PostgreSQL                     │
│ Fetch today's patient list         │  │ WEMA patient registration           │
│ Push EPDS result                   │  │ PHQ-2 and PHQ-9 records              │
│ Reconcile Wonder IDs               │  │ Scheduling and consultations        │
│                                    │  │ Dashboard and reports               │
│ Alert owner: Wonder                │  │ Alert owner: WEMA                    │
└───────────────────┬────────────────┘  └──────────────────┬──────────────────┘
                    ▼                                      ▼
┌────────────────────────────────────┐  ┌─────────────────────────────────────┐
│ WONDER HMIS                        │  │ WEMA WORKERS                        │
│                                    │  │                                     │
│ Master EPDS patient record         │  │ General Public WhatsApp alerts      │
│ EPDS clinical record               │  │ Retry processing                    │
│ EPDS high-risk alert               │  │ Report preparation                  │
│ EPDS downstream follow-up          │  │ Audit writing                       │
└────────────────────────────────────┘  └──────────────────┬──────────────────┘
                                                          ▼
                                         ┌────────────────────────────────────┐
                                         │ FACILITY WHATSAPP GROUP            │
                                         │ General Public alerts only         │
                                         └────────────────────────────────────┘
```

---

# 4. Workflow Boundaries

## 4.1 EPDS workflow

```text
Open /screening/epds
    ↓
Language
    ↓
Consent
    ↓
Load locally cached Wonder patient list
    ↓
Search and identify patient
    ↓
Complete EPDS
    ↓
Score locally
    ↓
Classify risk locally
    ↓
Store assessment in IndexedDB
    ↓
Show patient result
    ↓
Operational routing where required
    ↓
Sync to WEMA backend
    ↓
WEMA backend pushes result through Wonder Adapter
    ↓
Wonder stores result and handles the alert
```

### EPDS ownership

| Responsibility | Owner |
|---|---|
| Patient identity | Wonder |
| Local patient-list cache | WEMA |
| EPDS presentation | WEMA |
| EPDS local scoring | WEMA |
| EPDS operational routing | WEMA |
| EPDS final clinical record | Wonder |
| EPDS WhatsApp/high-risk alert | Wonder |
| EPDS downstream follow-up | Wonder |

WEMA must not send a duplicate WhatsApp alert for EPDS.

## 4.2 General Public workflow

```text
Open /screening/public
    ↓
Language
    ↓
Consent
    ↓
Register patient directly in WEMA
    ↓
Complete PHQ-2
    ↓
Score locally
    ↓
If threshold reached, open PHQ-9
    ↓
Score and classify risk locally
    ↓
Store locally in IndexedDB
    ↓
Route using WEMA availability and room data
    ↓
Create queue entry or appointment where required
    ↓
Sync to WEMA backend
    ↓
Store as WEMA-owned clinical screening record
    ↓
WEMA sends WhatsApp alert where policy requires
    ↓
Display later in WEMA dashboard
```

### General Public ownership

| Responsibility | Owner |
|---|---|
| Patient registration | WEMA |
| Patient master record for this workflow | WEMA |
| PHQ-2/PHQ-9 assessments | WEMA |
| Routing | WEMA |
| Room and psychologist assignment | WEMA |
| Scheduling | WEMA |
| WhatsApp alert | WEMA |
| Dashboard and reports | WEMA |
| Wonder integration | None |

---

# 5. Frontend Architecture

## 5.1 Patient application routes

```tsx
<Routes>
  <Route
    path="/screening/epds"
    element={<WorkflowEntry workflow="EPDS_WONDER" />}
  />

  <Route
    path="/screening/public"
    element={<WorkflowEntry workflow="GENERAL_PUBLIC_PHQ" />}
  />
</Routes>
```

The route loads a workflow configuration.

```ts
export const workflowRegistry = {
  EPDS_WONDER: {
    route: "/screening/epds",
    patientSource: "WONDER",
    assessmentPath: ["EPDS"],
    integrationTarget: "WONDER",
    alertOwner: "WONDER",
  },

  GENERAL_PUBLIC_PHQ: {
    route: "/screening/public",
    patientSource: "WEMA",
    assessmentPath: ["PHQ2", "PHQ9_IF_TRIGGERED"],
    integrationTarget: "WEMA_ONLY",
    alertOwner: "WEMA",
  },
} as const;
```

## 5.2 Psychologist portal

The psychologist portal is one separate authenticated frontend client.

It receives operational records from both workflows but must show their source clearly.

```text
Psychologist Portal
├── Login
├── My profile
├── Start/end shift
├── Availability status
├── Room assignment
├── Unified live queue
│   ├── EPDS / Wonder
│   └── General Public / WEMA
├── Current assignment
├── Consultations
├── General Public scheduling
├── General Public dashboard
└── Audit history
```

EPDS information shown in the portal should be limited to operational information required for routing and consultation unless a wider Wonder integration is contractually approved.

---

# 6. Local-First and Offline-First Architecture

## 6.1 Core rule

Every patient action is written locally before any network request.

```text
User action
    ↓
IndexedDB transaction
    ↓
UI updates
    ↓
Outbox item created
    ↓
Network sync attempted later
```

The patient must never be blocked by an unavailable internet connection.

## 6.2 IndexedDB stores

```text
cachedWonderPatients
publicPatients
screeningSessions
assessmentDrafts
assessmentAnswers
assessments
routingDecisions
psychologists
availabilitySnapshots
rooms
assignments
queueEntries
appointments
contentManifests
outbox
syncState
auditEvents
deviceConfiguration
```

## 6.3 Offline behavior

| Situation | Required behavior |
|---|---|
| Internet unavailable | Continue screening locally |
| Backend unavailable | Keep records in outbox |
| Wonder unavailable | EPDS stays pending and retries later |
| WhatsApp provider unavailable | General Public alert stays queued |
| Tablet closes during assessment | Resume from last saved answer |
| Duplicate retry | Backend rejects duplicate through idempotency key |
| Connectivity returns | Flush outbox and refresh reference data |

## 6.4 Availability limitation

Psychologist and room status can become stale while a tablet is offline.

For MVP1:

- tablets use the latest synchronized availability snapshot;
- assignments are provisional locally;
- backend confirms or resolves conflicts when synchronized;
- the UI must show when resource data was last updated;
- high-risk cases must never disappear because of an assignment conflict.

---

# 7. Wonder Adapter

The patient application must never call Wonder directly.

```text
Patient App
   ↓
WEMA Backend
   ↓
Wonder Adapter
   ↓
Wonder API
```

## 7.1 Responsibilities

The Wonder adapter must:

- authenticate with Wonder;
- fetch the current facility patient list;
- normalize Wonder field names;
- validate received records;
- map Wonder patient IDs to WEMA cache records;
- push EPDS assessments;
- handle timeouts and retries;
- prevent duplicate submission;
- store integration status;
- redact patient information from logs;
- expose health and failure status.

## 7.2 Suggested interface

```ts
export interface WonderAdapter {
  fetchPatientQueue(input: {
    facilityId: string;
    date: string;
  }): Promise<NormalizedWonderPatient[]>;

  pushEpdsAssessment(input: {
    wonderPatientId: string;
    wonderVisitId?: string;
    assessment: EpdsAssessmentPayload;
    idempotencyKey: string;
  }): Promise<WonderPushResult>;
}
```

## 7.3 Data received from Wonder

The exact contract must be confirmed with the Wonder technical team. WEMA should normalize only approved minimum fields.

```ts
interface NormalizedWonderPatient {
  wonderPatientId: string;
  wonderVisitId?: string;
  facilityId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phoneNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  clinic?: string;
  visitDate: string;
}
```

---

# 8. Data Model

## 8.1 Patients

```text
patients
├── id
├── source: WONDER | WEMA
├── wonder_patient_id nullable
├── wonder_visit_id nullable
├── first_name
├── middle_name nullable
├── last_name
├── phone nullable
├── national_id nullable
├── date_of_birth nullable
├── location nullable
├── facility_id
├── registration_source
├── created_at
└── updated_at
```

## 8.2 Screening sessions

```text
screening_sessions
├── id
├── patient_id
├── workflow_type: EPDS_WONDER | GENERAL_PUBLIC_PHQ
├── patient_source: WONDER | WEMA
├── integration_target: WONDER | WEMA_ONLY
├── alert_owner: WONDER | WEMA
├── facility_id
├── device_id
├── language
├── consent_version
├── consented_at
├── status
├── started_at
└── completed_at
```

## 8.3 Assessments

```text
assessments
├── id
├── screening_session_id
├── tool: EPDS | PHQ2 | PHQ9
├── score
├── risk_level
├── rule_version
├── integration_target
├── sync_status
├── completed_at
└── created_at
```

## 8.4 Operational tables

```text
assessment_answers
routing_decisions
psychologists
psychologist_shifts
psychologist_availability
rooms
assignments
queue_entries
appointments
consultations
notifications
integration_events
outbox_jobs
audit_logs
devices
facilities
media_assets
configuration
```

---

# 9. Correct Monorepo File Structure

```text
wema/
├── apps/
│   ├── patient-app/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── routes.tsx
│   │   │   │   ├── providers.tsx
│   │   │   │   ├── error-boundary.tsx
│   │   │   │   └── workflow-entry.tsx
│   │   │   │
│   │   │   ├── workflows/
│   │   │   │   ├── registry/
│   │   │   │   │   ├── workflow.types.ts
│   │   │   │   │   ├── workflow-registry.ts
│   │   │   │   │   └── workflow-context.tsx
│   │   │   │   │
│   │   │   │   ├── epds-wonder/
│   │   │   │   │   ├── config.ts
│   │   │   │   │   ├── routes.tsx
│   │   │   │   │   ├── patient-identification/
│   │   │   │   │   ├── assessment/
│   │   │   │   │   ├── results/
│   │   │   │   │   ├── routing-policy/
│   │   │   │   │   ├── integration-policy/
│   │   │   │   │   └── tests/
│   │   │   │   │
│   │   │   │   └── general-public-phq/
│   │   │   │       ├── config.ts
│   │   │   │       ├── routes.tsx
│   │   │   │       ├── patient-registration/
│   │   │   │       ├── phq2/
│   │   │   │       ├── phq9/
│   │   │   │       ├── results/
│   │   │   │       ├── routing-policy/
│   │   │   │       ├── scheduling/
│   │   │   │       ├── notification-policy/
│   │   │   │       └── tests/
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── language/
│   │   │   │   ├── consent/
│   │   │   │   ├── screening-engine/
│   │   │   │   │   ├── components/
│   │   │   │   │   ├── hooks/
│   │   │   │   │   ├── navigation/
│   │   │   │   │   ├── autosave/
│   │   │   │   │   └── session/
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
│   │   │   ├── local/
│   │   │   │   ├── db/
│   │   │   │   │   ├── database.ts
│   │   │   │   │   ├── schema.ts
│   │   │   │   │   └── migrations.ts
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── wonder-patient.repository.ts
│   │   │   │   │   ├── public-patient.repository.ts
│   │   │   │   │   ├── session.repository.ts
│   │   │   │   │   ├── assessment.repository.ts
│   │   │   │   │   └── availability.repository.ts
│   │   │   │   ├── outbox/
│   │   │   │   ├── sync/
│   │   │   │   ├── connectivity/
│   │   │   │   ├── event-bus/
│   │   │   │   └── service-worker/
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   ├── sessions.api.ts
│   │   │   │   ├── patients.api.ts
│   │   │   │   ├── assessments.api.ts
│   │   │   │   ├── resources.api.ts
│   │   │   │   └── sync.api.ts
│   │   │   │
│   │   │   ├── i18n/
│   │   │   ├── shared/
│   │   │   ├── types/
│   │   │   └── main.tsx
│   │   │
│   │   ├── public/
│   │   │   ├── icons/
│   │   │   ├── offline/
│   │   │   └── manifest.webmanifest
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
│       │   ├── features/
│       │   │   ├── authentication/
│       │   │   ├── profile/
│       │   │   ├── shifts/
│       │   │   ├── availability/
│       │   │   ├── rooms/
│       │   │   ├── unified-queue/
│       │   │   ├── assignments/
│       │   │   ├── consultations/
│       │   │   ├── scheduling/
│       │   │   ├── general-public-dashboard/
│       │   │   ├── reports/
│       │   │   └── audit-history/
│       │   ├── api/
│       │   │   ├── client.ts
│       │   │   ├── auth.api.ts
│       │   │   ├── availability.api.ts
│       │   │   ├── rooms.api.ts
│       │   │   ├── queue.api.ts
│       │   │   ├── consultations.api.ts
│       │   │   ├── scheduling.api.ts
│       │   │   └── dashboard.api.ts
│       │   ├── auth/
│       │   ├── shared/
│       │   ├── i18n/
│       │   ├── types/
│       │   └── main.tsx
│       ├── public/
│       ├── tests/
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── services/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── users/
│   │   │   │   ├── devices/
│   │   │   │   ├── facilities/
│   │   │   │   ├── patients/
│   │   │   │   ├── screening-sessions/
│   │   │   │   ├── assessments/
│   │   │   │   ├── workflow-orchestration/
│   │   │   │   │   ├── workflow.interface.ts
│   │   │   │   │   ├── workflow.registry.ts
│   │   │   │   │   ├── epds-wonder.workflow.ts
│   │   │   │   │   └── general-public-phq.workflow.ts
│   │   │   │   ├── routing/
│   │   │   │   ├── psychologists/
│   │   │   │   ├── availability/
│   │   │   │   ├── rooms/
│   │   │   │   ├── assignments/
│   │   │   │   ├── queue/
│   │   │   │   ├── scheduling/
│   │   │   │   ├── consultations/
│   │   │   │   ├── notifications/
│   │   │   │   ├── dashboards/
│   │   │   │   ├── reports/
│   │   │   │   ├── synchronization/
│   │   │   │   ├── integration-routing/
│   │   │   │   ├── media/
│   │   │   │   ├── configuration/
│   │   │   │   ├── audit/
│   │   │   │   └── health/
│   │   │   │
│   │   │   ├── integrations/
│   │   │   │   ├── wonder/
│   │   │   │   │   ├── wonder.adapter.ts
│   │   │   │   │   ├── wonder.client.ts
│   │   │   │   │   ├── wonder.mapper.ts
│   │   │   │   │   ├── wonder.contracts.ts
│   │   │   │   │   └── wonder.errors.ts
│   │   │   │   └── whatsapp/
│   │   │   │       ├── whatsapp.adapter.ts
│   │   │   │       ├── whatsapp.client.ts
│   │   │   │       ├── whatsapp.templates.ts
│   │   │   │       └── whatsapp.errors.ts
│   │   │   │
│   │   │   ├── database/
│   │   │   │   ├── connection.ts
│   │   │   │   ├── transaction.ts
│   │   │   │   └── repositories/
│   │   │   ├── middleware/
│   │   │   ├── config/
│   │   │   ├── shared/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── migrations/
│   │   ├── seeds/
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── workers/
│       ├── src/
│       │   ├── handlers/
│       │   │   ├── push-epds-to-wonder.handler.ts
│       │   │   ├── refresh-wonder-patients.handler.ts
│       │   │   ├── send-public-whatsapp-alert.handler.ts
│       │   │   ├── write-audit.handler.ts
│       │   │   └── generate-report.handler.ts
│       │   ├── job-runner.ts
│       │   ├── retry-policy.ts
│       │   └── worker.ts
│       ├── tests/
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   ├── domain/
│   │   ├── src/
│   │   │   ├── patients/
│   │   │   ├── screening-sessions/
│   │   │   ├── assessments/
│   │   │   ├── workflows/
│   │   │   ├── routing/
│   │   │   ├── availability/
│   │   │   ├── rooms/
│   │   │   ├── assignments/
│   │   │   ├── queue/
│   │   │   ├── scheduling/
│   │   │   └── notifications/
│   │   └── package.json
│   │
│   ├── scoring/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── epds/
│   │   │   │   ├── questions.ts
│   │   │   │   ├── scoring.ts
│   │   │   │   ├── rules.ts
│   │   │   │   └── tests/
│   │   │   ├── phq2/
│   │   │   │   ├── questions.ts
│   │   │   │   ├── scoring.ts
│   │   │   │   ├── rules.ts
│   │   │   │   └── tests/
│   │   │   └── phq9/
│   │   │       ├── questions.ts
│   │   │       ├── scoring.ts
│   │   │       ├── rules.ts
│   │   │       └── tests/
│   │   └── package.json
│   │
│   ├── clinical-rules/
│   │   ├── src/
│   │   │   ├── common/
│   │   │   ├── epds/
│   │   │   └── general-public-phq/
│   │   └── package.json
│   │
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── api/
│   │   │   ├── sync/
│   │   │   ├── wonder/
│   │   │   ├── notifications/
│   │   │   └── reports/
│   │   └── package.json
│   │
│   ├── validation/
│   ├── config/
│   ├── i18n-shared/
│   └── ui/
│
├── content/
│   ├── translations/
│   │   ├── en/
│   │   │   ├── common.json
│   │   │   ├── consent.json
│   │   │   ├── epds.json
│   │   │   ├── phq2.json
│   │   │   ├── phq9.json
│   │   │   ├── results.json
│   │   │   └── routing.json
│   │   ├── sw/
│   │   └── luo/
│   ├── audio/
│   │   ├── en/
│   │   ├── sw/
│   │   └── luo/
│   ├── avatar/
│   ├── video/
│   ├── clinical-messages/
│   └── manifests/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   │   └── routes.conf
│   ├── deployment/
│   │   ├── development/
│   │   ├── staging/
│   │   └── production/
│   ├── monitoring/
│   ├── backups/
│   └── security/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── clinical/
│   ├── integration/
│   ├── testing/
│   ├── deployment/
│   ├── security/
│   └── runbooks/
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
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docker-compose.yml
├── package.json
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
├── .env.example
├── .gitignore
├── CONTRIBUTING.md
└── README.md
```

---

# 10. Why This Structure Is Correct

## 10.1 Workflow-specific code is explicit

The patient application contains:

```text
workflows/epds-wonder/
workflows/general-public-phq/
```

This prevents Wonder-specific logic from leaking into the General Public workflow.

## 10.2 Shared capabilities are not duplicated

Language, consent, media, question navigation, local persistence, routing UI and session reset remain in shared feature folders.

## 10.3 PHQ-2 and PHQ-9 are included in MVP1

They are implemented, tested and versioned as real modules, not marked as future placeholders.

## 10.4 Wonder is an external integration

Wonder code is isolated under:

```text
services/api/src/integrations/wonder/
```

The rest of WEMA uses normalized internal contracts.

## 10.5 WhatsApp ownership is clear

Only the General Public worker exists:

```text
send-public-whatsapp-alert.handler.ts
```

There is no generic EPDS WhatsApp handler that could send duplicate alerts.

## 10.6 The psychologist portal remains one application

It contains a unified queue but can filter by workflow and source.

---

# 11. API Structure

## 11.1 Public frontend API routes

```text
POST   /api/v1/screening-sessions
GET    /api/v1/screening-sessions/:id
POST   /api/v1/screening-sessions/:id/complete

GET    /api/v1/wonder/patients/today
POST   /api/v1/public-patients

POST   /api/v1/assessments
GET    /api/v1/assessments/:id

GET    /api/v1/resources/psychologists
GET    /api/v1/resources/rooms
POST   /api/v1/routing-decisions
POST   /api/v1/assignments
POST   /api/v1/queue-entries
POST   /api/v1/appointments

POST   /api/v1/sync/push
GET    /api/v1/sync/pull
```

## 11.2 Psychologist portal API routes

```text
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout

POST   /api/v1/psychologists/me/start-shift
POST   /api/v1/psychologists/me/end-shift
PATCH  /api/v1/psychologists/me/availability
PATCH  /api/v1/psychologists/me/room

GET    /api/v1/queues
GET    /api/v1/assignments
POST   /api/v1/consultations/:id/start
POST   /api/v1/consultations/:id/complete

GET    /api/v1/appointments
POST   /api/v1/appointments
PATCH  /api/v1/appointments/:id

GET    /api/v1/dashboard/general-public
GET    /api/v1/reports/general-public
```

## 11.3 Internal integration routes/jobs

```text
REFRESH_WONDER_PATIENTS
PUSH_EPDS_TO_WONDER
SEND_PUBLIC_WHATSAPP_ALERT
WRITE_AUDIT_LOG
GENERATE_GENERAL_PUBLIC_REPORT
```

---

# 12. Workflow Orchestration

The backend workflow registry determines allowed behavior.

```ts
interface WorkflowDefinition {
  type: WorkflowType;
  patientSource: "WONDER" | "WEMA";
  tools: Array<"EPDS" | "PHQ2" | "PHQ9">;
  integrationTarget: "WONDER" | "WEMA_ONLY";
  alertOwner: "WONDER" | "WEMA";
  schedulingEnabled: boolean;
  dashboardEnabled: boolean;
}
```

```ts
const workflows: Record<WorkflowType, WorkflowDefinition> = {
  EPDS_WONDER: {
    type: "EPDS_WONDER",
    patientSource: "WONDER",
    tools: ["EPDS"],
    integrationTarget: "WONDER",
    alertOwner: "WONDER",
    schedulingEnabled: false,
    dashboardEnabled: false,
  },

  GENERAL_PUBLIC_PHQ: {
    type: "GENERAL_PUBLIC_PHQ",
    patientSource: "WEMA",
    tools: ["PHQ2", "PHQ9"],
    integrationTarget: "WEMA_ONLY",
    alertOwner: "WEMA",
    schedulingEnabled: true,
    dashboardEnabled: true,
  },
};
```

The backend rejects invalid combinations, such as:

- EPDS session with a WEMA-only integration target;
- General Public session with a Wonder patient;
- PHQ-9 without an eligible General Public session;
- WEMA WhatsApp alert for an EPDS assessment.

---

# 13. Implementation Phases

## Phase 0 — Clinical and integration confirmation

Confirm:

- EPDS scoring and risk rules;
- PHQ-2 threshold for opening PHQ-9;
- PHQ-9 risk bands and escalation rules;
- approved multilingual text;
- Wonder patient-list API;
- Wonder EPDS submission API;
- Wonder alert ownership;
- WEMA General Public WhatsApp destination;
- facility rooms and psychologist list;
- scheduling rules;
- data-retention requirements.

**Exit criterion:** all critical contracts and clinical decisions are documented.

## Phase 1 — Monorepo and development environment

Build:

- root workspace;
- patient app;
- psychologist portal;
- backend API;
- worker service;
- shared packages;
- Docker Compose;
- PostgreSQL;
- linting;
- type checking;
- unit test setup;
- CI pipeline.

**Exit criterion:** a clean machine can clone the repository and start all services.

## Phase 2 — Shared domain, database and API contracts

Implement:

- workflow types;
- patient-source types;
- integration-target types;
- alert-owner types;
- PostgreSQL schema;
- IndexedDB schema;
- shared validation;
- idempotency;
- audit-event model;
- sync contracts.

**Exit criterion:** frontend and backend compile against the same contracts.

## Phase 3 — Offline-first foundation

Implement:

- Workbox service worker;
- app-shell caching;
- Dexie database;
- local repositories;
- assessment autosave;
- session resume;
- outbox;
- retry policy;
- connectivity listener;
- sync status indicators.

**Exit criterion:** a screening can start, continue, complete and survive refresh while offline.

## Phase 4 — EPDS workflow and Wonder integration

Implement:

- `/screening/epds`;
- locally cached Wonder patient list;
- patient search and verification;
- EPDS questions;
- local scoring;
- local risk classification;
- result messages;
- assessment sync;
- Wonder adapter;
- push-to-Wonder worker;
- integration status and retry.

**Exit criterion:** a complete EPDS assessment reaches the correct Wonder patient without WEMA sending a duplicate alert.

## Phase 5 — General Public PHQ workflow

Implement:

- `/screening/public`;
- WEMA patient registration;
- PHQ-2;
- conditional PHQ-9;
- local scoring;
- risk classification;
- results;
- WEMA-only persistence;
- dashboard-ready data model.

**Exit criterion:** General Public data remains entirely in WEMA and never enters the Wonder adapter.

## Phase 6 — Shared routing and clinical operations

Implement:

- psychologist shift status;
- availability;
- room status;
- assignments;
- waiting queue;
- queue priorities;
- provisional offline routing;
- backend conflict resolution;
- consultations.

**Exit criterion:** both workflows can use the same operational resource services.

## Phase 7 — Psychologist portal

Implement:

- `/psychologist`;
- authentication;
- profile;
- shift management;
- availability;
- room selection;
- unified queue;
- workflow badges;
- assignment handling;
- consultation start/complete;
- scheduling;
- General Public dashboard foundation.

**Exit criterion:** psychologists use one portal for both workflow queues.

## Phase 8 — Notifications and scheduling

Implement:

- General Public alert policy;
- WhatsApp worker;
- retry and failure visibility;
- appointment creation;
- appointment status;
- portal appointment view;
- no EPDS WhatsApp path.

**Exit criterion:** only General Public alerts are sent by WEMA.

## Phase 9 — Content, accessibility and privacy

Implement:

- English, Kiswahili and Luo;
- text/audio/avatar support;
- offline media manifests;
- accessible navigation;
- privacy reset;
- consent versioning;
- safe user-facing errors.

## Phase 10 — QA, UAT and deployment

Test:

- unit;
- integration;
- API;
- Wonder contract;
- offline;
- reconnect;
- duplicate submission;
- crash recovery;
- queue conflict;
- role authorization;
- WhatsApp failure;
- performance;
- clinical acceptance;
- user acceptance.

Deploy through:

```text
Development
   ↓
Staging
   ↓
Clinical validation
   ↓
Production
```

---

# 14. Testing Priorities

The following tests are release-blocking:

1. EPDS records are pushed only to Wonder.
2. General Public records are never pushed to Wonder.
3. EPDS does not trigger a WEMA WhatsApp alert.
4. General Public high-risk cases create the configured WEMA alert.
5. PHQ-9 opens only when the approved PHQ-2 condition is met.
6. Every answer survives refresh or power interruption.
7. Duplicate sync does not create duplicate assessments.
8. A failed Wonder request remains visible and retryable.
9. A high-risk General Public case cannot disappear because an alert provider is unavailable.
10. A psychologist can distinguish EPDS and General Public queue entries.
11. A manually typed URL cannot override backend workflow validation.
12. Patient-session reset removes the previous patient’s visible data.

---

# 15. Security and Clinical Safety

Implement:

- HTTPS;
- encrypted database and backup controls appropriate to the deployment;
- JWT for the psychologist portal;
- device registration for screening tablets;
- role-based authorization;
- short-lived access tokens;
- secure refresh-token handling;
- PII redaction in logs;
- audit trails;
- minimum-necessary patient data;
- session timeout;
- failed-sync visibility;
- idempotency;
- consent versioning;
- high-risk escalation safeguards;
- backup and restore testing.

The following require stakeholder confirmation:

- retention duration;
- Wonder data-sharing fields;
- consent wording;
- WhatsApp content;
- alert recipients;
- psychologist access scope;
- whether EPDS operational details may appear in the WEMA portal;
- PHQ-2 and PHQ-9 clinical thresholds;
- production hosting and facility network topology.

---

# 16. Deployment Routing

For MVP1, use one domain with explicit routes.

```text
https://wema.health/screening/epds
https://wema.health/screening/public
https://wema.health/psychologist
```

Nginx or the hosting platform routes:

```text
/screening/*   → patient-app static bundle
/psychologist* → psychologist-portal static bundle
/api/*         → WEMA backend API
```

Example:

```nginx
location /screening/ {
  try_files $uri /patient-app/index.html;
}

location /psychologist/ {
  try_files $uri /psychologist-portal/index.html;
}

location /api/ {
  proxy_pass http://wema-api;
}
```

---

# 17. Final Responsibility Matrix

| Component | EPDS | General Public |
|---|---|---|
| Entry route | `/screening/epds` | `/screening/public` |
| Patient source | Wonder | WEMA |
| Assessment | EPDS | PHQ-2 → PHQ-9 |
| Local-first | Yes | Yes |
| Final data destination | Wonder | WEMA |
| WEMA database copy | Operational/sync record | Primary record |
| Wonder integration | Yes | No |
| Alert owner | Wonder | WEMA |
| Scheduling | Not part of the Wonder-owned final pathway unless separately approved | WEMA |
| Dashboard | Limited operational visibility | Full WEMA dashboard |
| Psychologist portal | Shared | Shared |
| Rooms and availability | Shared WEMA services | Shared WEMA services |
| Queue | Shared WEMA service | Shared WEMA service |

---

# 18. Non-Negotiable Architecture Rules

1. WEMA is one platform, not two unrelated systems.
2. The route determines the initial patient workflow.
3. The backend persists and validates the trusted workflow context.
4. EPDS patients come from Wonder.
5. General Public patients are registered in WEMA.
6. EPDS results are pushed to Wonder.
7. General Public results never go to Wonder.
8. Wonder sends EPDS alerts.
9. WEMA sends General Public alerts.
10. Both workflows use the same psychologist portal.
11. Both workflows use shared room, availability, routing and queue services.
12. Every patient action is written locally before network synchronization.
13. PHQ-2 and PHQ-9 are part of MVP1, not future placeholders.
14. PCL and DAST are not part of the current MVP1 implementation.
15. No admin portal is required for MVP1.
16. No CHP task-generation module is included in WEMA MVP1.
