# Contributing to WEMA MVP1

This document defines how to contribute code to the WEMA MVP1 monorepo (Patient App, Psychologist Portal, API, Worker, and shared packages). It covers the Git workflow, branch naming, commit conventions, Pull Request process, review requirements, testing expectations, and the Definition of Done.

All contributors are expected to follow this guide. It is derived from the approved WEMA GitHub Working Plan and Development Process document.

---

## 1. Guiding Principles

| Principle | Practical meaning |
|---|---|
| Simple | Use the smallest number of branch types and labels needed to control the work. |
| Traceable | Every change links back to an issue, acceptance criteria, test evidence, and a Pull Request. |
| Safe | Clinical rules, scoring, routing, alerts, and integrations require the correct specialist reviews. |
| Protected | No direct development work happens on `main` or `develop`. |
| Releasable | `main` always represents an approved production release. |
| Maintainable | Temporary branches are deleted after merge; decisions are documented in GitHub, not chat. |

---

## 2. Git Workflow

WEMA uses a **simplified GitFlow** model with two permanent branches. Never commit directly to either — always create a temporary branch and open a Pull Request.

| Branch | Meaning | What may merge into it |
|---|---|---|
| `main` | Approved, tested, production-ready code. Every production tag is created here. | `release/*` and `hotfix/*` via Pull Request |
| `develop` | The combined work planned for the next release. May be deployed to development or staging. | `feature/*`, `fix/*`, `chore/*`, `docs/*`, plus release/hotfix back-merges |

### Branch flow diagrams

```
NORMAL FEATURE
develop -> feature/* -> Pull Request -> develop

NORMAL BUG
develop -> fix/* -> Pull Request -> develop

RELEASE
develop -> release/vX.Y.Z -> main
                          -> develop

PRODUCTION EMERGENCY
main -> hotfix/* -> main
                  -> develop
```

- Normal work (features, fixes, docs, chores) always starts from `develop` and merges back into `develop`.
- When a release is functionally complete, a `release/*` branch is cut from `develop` for final QA, UAT, and clinical validation, then merged into both `main` and `develop`.
- Emergency production corrections use a `hotfix/*` branch cut from `main` (never from `develop`), merged back into both `main` and `develop`.
- There is no exception permitting undocumented direct commits to `main`, even under urgency — use an expedited hotfix Pull Request instead.

---

## 3. Branch Naming Convention

Format: `<branch-type>/<issue-number>-<short-kebab-description>`

The issue number may be omitted only for `release/*` and `hotfix/*`, where the version or incident name is clearer.

| Branch pattern | Created from | Merged into | Use | Example |
|---|---|---|---|---|
| `feature/*` | `develop` | `develop` | New functionality | `feature/123-epds-scoring` |
| `fix/*` | `develop` | `develop` | Normal bug found before production | `fix/148-queue-order` |
| `chore/*` | `develop` | `develop` | Configuration, tooling, maintenance | `chore/160-docker-worker` |
| `docs/*` | `develop` | `develop` | Documentation-only work | `docs/171-wonder-contract` |
| `spike/*` | `develop` | Usually not merged | Time-boxed research or prototype | `spike/180-queue-library` |
| `release/*` | `develop` | `main` and `develop` | Final QA and release preparation | `release/v0.4.0` |
| `hotfix/*` | `main` | `main` and `develop` | Urgent production correction | `hotfix/201-duplicate-wonder-push` |

### A note on spikes
A spike answers a technical question before real work begins — it is allowed to fail, and the branch is normally thrown away. If it works, delete the spike and open a proper `feature/*` branch informed by what was learned. If it doesn't work, delete it and record the outcome (what was tried and why it didn't work) in the issue or a Decision Log entry — the decision must survive even though the code doesn't.

Keep branches focused on one piece of work, and delete temporary branches after merge. Split large features into smaller issues/branches rather than leaving one branch open for weeks.

---

## 4. Commit Message Convention

Use clear Conventional Commit prefixes so history and generated release notes stay readable. Because squash merge uses the **Pull Request title** as the final commit on the target branch, that title is the primary enforcement point — smaller working commits inside a branch don't need to be as strict.

| Prefix | Use | Example |
|---|---|---|
| `feat:` | New capability | `feat: add EPDS scoring engine` |
| `fix:` | Bug correction | `fix: preserve queue order after reconnect` |
| `chore:` | Tooling or configuration | `chore: configure worker container` |
| `docs:` | Documentation only | `docs: document Wonder result mapping` |
| `test:` | Tests only | `test: add PHQ threshold boundary cases` |
| `refactor:` | Internal improvement, no behavior change | `refactor: simplify sync repository` |
| `perf:` | Performance improvement | `perf: reduce patient cache load time` |

---

## 5. Pull Request Process

A Pull Request is the formal checkpoint between an individual branch and a protected branch. It should be small enough for meaningful review, and must explain: the change, the linked issue, test evidence, screenshots for interface changes, offline/error behavior, and any clinical or integration impact.

**Steps:**

1. Create the branch from the correct base branch (see Section 2).
2. Implement the issue and add or update tests.
3. Push the branch and open a Pull Request into `develop`, `main`, or another approved target.
4. Link the issue using `Closes #123` where appropriate.
5. Wait for CI and resolve any failures.
6. Obtain the required reviews and resolve all conversations.
7. Merge using the approved method and delete the temporary branch.
8. Move the issue to **QA / Clinical Validation** or **Done** based on remaining evidence.

The author is responsible for preparing a reviewable change — reviewers should not have to discover requirements from chat messages.

---

## 6. Code Review Requirements

Review requirements scale with risk. At minimum, every change needs one peer engineer's approval; higher-risk areas require additional named specialists.

| Change type | Required approval |
|---|---|
| Standard feature, fix, docs, or chore | 1 peer engineer |
| Architecture, database schema, contracts, or sync protocol | Peer engineer + Senior Software Architect |
| Scoring, classification, routing, alerts, or safety rules | Peer engineer + Clinical Lead/Healthcare Systems Architect + QA evidence |
| Wonder integration | Peer engineer + Backend owner; Wonder team review where the external contract changes |
| Infrastructure, CI/CD, secrets, or security config | Peer engineer + DevOps owner |
| Release to `main` | Technical Lead + QA sign-off + Technical PM confirmation; clinical sign-off where applicable |

Branch protection applies to both permanent branches: direct pushes and force pushes are blocked, Pull Requests and passing CI are required, and all review conversations must be resolved before merge.

CODEOWNERS automatically requests the accountable specialist reviewers when files in sensitive paths (clinical rules, database, contracts, integrations, infrastructure) change. It does not replace the review requirements above — it helps ensure they're met.

---

## 7. Testing Expectations

CI runs automatically on Pull Requests to `develop` and `main`. Checks must pass before merge.

| CI level | Required checks |
|---|---|
| Every Pull Request | Install, lint, formatting check, typecheck, unit tests, build |
| Clinical package change | Golden cases, threshold boundaries, rule-version checks |
| API/contract change | Schema validation and contract tests |
| Database change | Migration validation and repository tests |
| Release branch | Integration tests, E2E, offline/recovery tests, security checks, release build |
| Production deployment | Manual approval plus smoke tests and monitoring verification |

Clinical golden tests and contract tests run whenever affected packages change. A release branch cannot merge to `main` until the full release test suite and required manual approvals pass.

---

## 8. Definition of Ready / Definition of Done

### Definition of Ready
Confirms an issue can enter a sprint — the team understands what must be built and how success is measured.

- Clear problem and expected outcome
- Acceptance criteria written
- Milestone, sprint, owner, and priority assigned
- Design available for UI work
- Clinical wording/rules drafted and reviewer identified (where applicable)
- Dependencies available or mocked
- Test scenarios identified
- No unresolved scope decision

### Definition of Done
An issue is done only when it has been reviewed, tested, documented, verified against acceptance criteria, and clinically approved where required. Work awaiting QA or clinical sign-off stays in validation — not Done.

- Merged through the correct Pull Request flow
- Required CI and tests pass
- Acceptance criteria independently verified
- Offline, loading, empty, and error states handled where relevant
- Audit, privacy, and redaction requirements met
- Documentation and decision records updated
- Clinical or specialist approval recorded where required
- Temporary branch deleted and issue evidence linked

---

## 9. Hotfix Process (Urgent Production Defects)

Reserved for urgent production defects only (e.g. loss of screening data, incorrect clinical classification, unauthorized access, duplicate Wonder submission, production outage). Ordinary bugs found during development or release testing use `fix/*` branches instead.

1. Create `hotfix/<issue-or-incident-description>` from `main`.
2. Implement the smallest safe correction and add a regression test.
3. Open an expedited Pull Request to `main` and obtain required specialist review.
4. Merge, create a patch tag, and deploy through the controlled production workflow.
5. Merge the hotfix into `develop` and any active release branch.
6. Record the incident, cause, impact, validation, and follow-up action.

---

## 10. Change Control

Changes to contractual scope, clinical rules, database ownership, offline synchronization, security controls, or the boundary between EPDS–Wonder and General Public PHQ–WhatsApp workflows require a documented decision **before** implementation — recorded as a GitHub Decision Log issue or an Architecture Decision Record in `docs/architecture/decisions`, not left in chat or meeting notes. Related issues and Pull Requests must link back to that decision.

---

## 11. Quick Reference

| Question | Answer |
|---|---|
| Where is production code? | `main` |
| Where is the next release assembled? | `develop` |
| Where does a new feature start? | `feature/*` from `develop` |
| Where does a normal pre-production bug start? | `fix/*` from `develop` or the active release branch |
| Where is final release testing done? | `release/vX.Y.Z` |
| Where does an urgent production fix start? | `hotfix/*` from `main` |
| Can developers push directly to `main` or `develop`? | No |
| How does code reach a permanent branch? | Through a reviewed Pull Request with passing CI |
| Where are releases tagged? | `main` only |
| When is a spike branch used? | Only to answer a technical question before real work begins |

```
main    = production
develop = next release
feature = new work
fix     = normal bug
release = final validation
hotfix  = urgent production repair
```

---

*This CONTRIBUTING.md is derived from the approved WEMA MVP1 GitHub Working Plan and Development Process document. Repository configuration, branch protection rules, and CI/CD implementation are covered separately and are out of scope for this document.*
