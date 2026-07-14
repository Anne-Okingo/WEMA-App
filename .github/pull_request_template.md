Y## Description

<!-- 
Provide a brief description of what this PR does and why.
What problem does it solve? What feature does it add?
-->

Closes #<!-- Issue number -->

---

## Type of Change

<!-- Mark the relevant option with an "x" -->

- [ ] 🎯 New feature (non-breaking change which adds functionality)
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ♻️ Refactor (code restructuring, no behavioral change)
- [ ] 📚 Documentation (documentation updates)
- [ ] 🔧 Chore (dependencies, configuration, tooling)
- [ ] 🚀 Performance (improvement or optimization)
- [ ] 🔐 Security (security fix or improvement)

---

## Phase & Scope

<!-- Which phase does this belong to? -->

- [ ] Phase 1: Environment & CI/CD
- [ ] Phase 2: Database & Auth
- [ ] Phase 3: Offline Frontend
- [ ] Phase 4: EPDS & Scoring
- [ ] Phase 5: Routing, Queue, Availability
- [ ] Phase 6: Alerts, Sync, Wonder
- [ ] Phase 7: Psychologist Portal
- [ ] Phase 8: Multilingual & Accessibility
- [ ] Phase 9: Security & Safety
- [ ] Phase 10: QA & UAT
- [ ] Phase 11: Staging & Production
- [ ] Phase 12: Handover & Support

---

## Testing

<!-- How have you tested this change? -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Tested locally with `npm test`
- [ ] Tested locally with Docker Compose
- [ ] No new tests needed (explain why below)

**Test Coverage:**
<!-- Include test results or link to coverage report -->

---

## Code Quality

- [ ] Lint passes: `npm run lint`
- [ ] Formatting passes: `npm run format:check`
- [ ] TypeScript builds: `npm run build`
- [ ] No breaking changes to public APIs
- [ ] No console.log() or debugging code left behind

---

## Documentation

- [ ] Updated README if needed
- [ ] Updated relevant documentation in `/docs`
- [ ] Added/updated JSDoc comments for new functions/classes
- [ ] Updated architecture docs if this changes the system design
- [ ] No out-of-date comments left in code

---

## Clinical & Security (if applicable)

- [ ] No new security vulnerabilities introduced
- [ ] No sensitive data (API keys, credentials) committed
- [ ] Follows clinical audit logging requirements
- [ ] Handles errors gracefully (no data loss scenarios)
- [ ] Appropriate input validation added

---

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings or errors
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests passed locally with my changes
- [ ] All dependent changes have been merged and published

---

## Screenshots / Evidence

<!-- If applicable, add screenshots or videos showing the changes -->

---

## Notes for Reviewers

<!-- Any additional context for those reviewing this PR? -->

---

## Deployment Notes

<!-- Will this require special deployment steps or database migrations? -->

- [ ] No deployment changes needed
- [ ] Database migration required
- [ ] Environment variables need to be updated
- [ ] Breaking change to API
- [ ] Other (specify below)

**Details:**
<!-- Describe any special deployment considerations -->

---

## Commit Message

<!-- Example of what your commit message(s) should look like -->

```
feat(backend): add patient search endpoint

- Implement GET /api/v1/patients with filtering
- Add validation for search parameters
- Integrate Wonder HMIS lookup for master records

Closes #ISSUE_NUMBER
```
