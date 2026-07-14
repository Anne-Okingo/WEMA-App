# WEMA Unified Facility-to-Community Functional Workflow

**System Architecture & Operational Protocol**
*End-to-End Operational Mapping — Two Workflow Model*

---

> **📌 Document Update Notice**
> This revision updates the WEMA Unified Workflow and replaces the single-pathway description in the prior version with WEMA's full two-workflow model: (1) the EPDS workflow integrated into Wonder HMIS — MVP1, and (2) the General Public multi-tool screening workflow, which operates autonomously alongside outpatient services — MVP2.

---

## Overview: WEMA's Two Workflows

WEMA is a mental health screening system deployed in public health facilities and, in its second phase, alongside general outpatient services in the facility setting. WEMA operates as two distinct, purpose-built workflows:

### 🔵 Workflow 1 — MVP1: EPDS Workflow (Integrated into Wonder HMIS)

**Purpose:** Maternal mental health screening using the Edinburgh Postnatal Depression Scale (EPDS).

- Fully integrated with Wonder HMIS — patient records are pulled from and pushed back to Wonder.
- Runs on a facility tablet, post-triage, pre-consultation, and requires no ongoing staff involvement.
- Offline-first: screening, scoring, and routing all execute locally without a network dependency.

### 🟠 Workflow 2 — MVP2: General Public Workflow (Autonomous, Alongside Outpatient Services)

**Purpose:** Multi-tool mental health and substance-use screening for the general public.

- Operates autonomously — it is not dependent on a Wonder patient record and runs as a self-service kiosk flow alongside routine outpatient services.
- Supports three screening tools: PHQ-2 (with PHQ-9 escalation), PCL, and DAST.
- Automatically flags high-risk patients, checks psychologist/room availability, and routes accordingly — with graceful fallback to follow-up when no psychologist is available at close of business.

---

## Workflow 1 — EPDS Screening (Wonder-Integrated) — MVP1

This is the facility-based maternal mental health pathway. It runs on a tablet in the waiting room, after routine clinical triage and before the patient sees a doctor, and is fully synchronized with Wonder HMIS.

### STEP 1 — Patient Search (Wonder-Synced)

- Patient is located in the locally synchronized Wonder queue (read from IndexedDB, populated by a prior sync from the backend).
- If found: proceed directly to EPDS screening.
- If not found: patient is registered manually on-device (First Name, Middle Name, Last Name, Phone Number, National ID Number).
- **Manual registration never blocks screening — this is a hard architectural constraint, not a soft preference.**

### STEP 2 — EPDS Screening

- Patient completes all 10 EPDS questions, presented in two parts (Q1–5, Q6–10).
- The score is calculated entirely locally, in-browser — no internet connection required.

### STEP 3 — Low / Green Score — Self-Care Pathway

- EPDS score and clinical interpretation are displayed.
- A reassuring self-care message is shown, encouraging the patient to continue taking care of their mental health.
- The assessment is recorded locally and queued for sync to Wonder; the workflow ends and auto-resets.

### STEP 4 — High / Red Score — Immediate Routing

- The system immediately (locally, no network round-trip) checks the resource cache for an available counselling room.
- If available: Room Number, Counsellor, and directions are displayed to the patient.
- **Simultaneously, a RED ALERT is dispatched to the facility Psychologist WhatsApp Group** with Patient ID, Name, Score, Hospital, Time, and Assigned Room.
- Medium / Yellow scores follow the same routing logic, but are automatically deprioritized if a Red-risk patient arrives.

### STEP 5 — No Counsellor Available — Waiting Pathway

- If every psychologist is busy, a locally stored psychoeducation video is played while the patient waits.
- The patient is placed in the local queue (Red-risk patients placed ahead of Yellow-risk patients).
- Queue position and estimated wait time are shown; a room is assigned automatically once available.

### STEP 6 — End-of-Business Escalation

- If no psychologist becomes available and closing time is reached, a follow-up task is generated automatically.
- The backend creates an SMS task and assigns a Community Health Promoter (CHP) matched by the patient's residential ward/sub-location.
- This triggers a mandatory home visit and a community-level repeat screening cycle.
- The escalation decision is made locally (device knows the time and resource state); only the notification waits on connectivity.

### Workflow 1 Diagram

![Workflow 1 — EPDS Screening Flow](content/images/workflow1_epds.png)

---

## Workflow 2 — General Public Screening (Autonomous) — MVP2

This workflow serves the general outpatient population and runs autonomously alongside routine outpatient services — it does not require an existing Wonder patient record. It supports three screening tools and automatically escalates high-risk results to the on-site psychologist.

### STEP 1 — Patient Self-Registration (Kiosk)

The patient keys in their details directly at the self-service kiosk:
- **First Name, Middle Name, Last Name, ID Number, Phone Number, Location and Ward.**

### STEP 2 — Screening Tool Selection

The patient selects which type of screening they want to complete:
- **PHQ-2** (depression), **PCL** (trauma/PTSD), or **DAST** (substance use).

### STEP 3 — PHQ-2 Pathway with PHQ-9 Escalation

- If the patient scores high on PHQ-2, the PHQ-9 tool is automatically administered as a follow-up.
- If PHQ-9 is also high: the patient is flagged high (see Step 5).
- If PHQ-9 is low despite a high PHQ-2: the patient is shown a psychoeducation video with mental health messages.
- If PHQ-2 is low: the patient is shown their score, its health meaning, and a message encouraging them to stay healthy.

### STEP 4 — PCL / DAST Pathway

- If the patient scores low: the score and its meaning are shown, with a health reminder message.
- If the patient scores high: the patient is flagged high and routed as described in Step 5.

### STEP 5 — High-Risk Flagging & Routing

- The patient is flagged high and the system checks psychologist and room availability.
- If a psychologist is available: the screen displays the assigned Room, the available Psychologist, and the time — and an alert is sent to that psychologist.
- Once the session is clinically reviewed and logged by the psychologist, the workflow ends.

### STEP 6 — All Psychologists Engaged — Waiting & Retry

- If all psychologists are engaged, the patient is shown a psychoeducation message with an estimated waiting time.
- The system automatically retries in the background to find an available psychologist.
- As soon as one becomes available, the patient is scheduled and shown the room/psychologist/time.

### STEP 7 — End-of-Business Fallback

- If no psychologist becomes available and it is the end of business hours, the patient's data is stored for a later follow-up.
- The psychologist follows up with the patient once a slot becomes available, without requiring the patient to repeat the screening.

### Workflow 2 Diagram

![Workflow 2 — General Public Screening Flow](content/images/workflow2_general_public.png)

---

## Side-by-Side Comparison

| Aspect | Workflow 1: EPDS (MVP1) | Workflow 2: General Public (MVP2) |
|---|---|---|
| **Target population** | Postpartum mothers | General outpatient public |
| **Patient source** | Synced from Wonder HMIS, or manual local registration as fallback | Self-registered at kiosk (Name, ID, Phone, Location, Ward) |
| **Integration** | Fully integrated into Wonder HMIS | Runs autonomously alongside outpatient services |
| **Screening tool(s)** | EPDS (10 questions) | PHQ-2 → PHQ-9 escalation, PCL, DAST |
| **Low-risk result** | Reassuring self-care message; synced to Wonder | Score + health meaning + "stay healthy" message |
| **High-risk result** | Room/counsellor assigned; RED ALERT to WhatsApp group | Room/psychologist/time shown on screen; alert sent to psychologist |
| **No provider available** | Psychoeducation video; local wait queue (Red prioritized) | Psychoeducation + wait-time message; automatic retry |
| **End-of-day fallback** | CHP task: SMS + mandatory home visit + repeat screening | Patient data stored for later psychologist follow-up |
| **Connectivity model** | Offline-first; only notifications wait on connectivity | Runs alongside outpatient flow; retries handled automatically |

---

> **📌 Note on Roadmap**
> Workflow 1 (EPDS) is MVP1 and is the currently prioritized build. Workflow 2 (General Public — PHQ-2/PHQ-9, PCL, DAST) is MVP2 and extends the same underlying scoring and routing engine, which was designed from the outset to support additional tools without a schema migration.

---
*WEMA Unified Workflow Documentation • Kisumu County*
