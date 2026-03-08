---
phase: 2
slug: hook-config-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-08
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.mjs (or package.json scripts) |
| **Quick run command** | `npx vitest run tests/hooks-migration.test.mjs` |
| **Full suite command** | `npm run test:unit` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/hooks-migration.test.mjs`
- **After every plan wave:** Run `npm run test:unit`
- **Before `/gsdn:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | HOOK-01 | unit | `npx vitest run tests/hooks-migration.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | HOOK-02 | unit | `npx vitest run tests/hooks-migration.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | HOOK-03 | unit | `npx vitest run tests/hooks-migration.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | HOOK-04 | unit | `npx vitest run tests/hooks-migration.test.mjs` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | HOOK-05 | unit | `npx vitest run tests/hooks-migration.test.mjs` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 2 | HOOK-06 | unit | `npx vitest run tests/hooks-migration.test.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/hooks-migration.test.mjs` — stubs for HOOK-01 through HOOK-06
- [ ] Test fixtures with both flat and nested hook config formats

*Existing vitest infrastructure covers test running.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
