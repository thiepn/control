# P5 — Portfolio Insights, Recurring Review & Ecosystem Acceptance

Stacked draft branch feat/p5-insights-review from qualified P4 head.

Scope:
- Deterministic owner-scoped cross-project aggregates: states, priorities, overdue deadlines, missing next actions, blocker flags, milestone evidence coverage and weekly focus.
- Clearly labeled partial aggregates when input query caps are reached. Reported milestones are not treated as independently verified.
- Weekly review form (wins, blockers, next week) with draft revision, optimistic concurrency, immutable submitted records, server-captured snapshot and audit records.
- Owner-only, paginated audit explorer with project filter and explicit disclosure of raw before/after values on demand.
- Credential-presence integration diagnostic that does **not** claim real connectivity or return secrets; evidence age and repository-link count.
- Browser offline indicator, retry/reload controls, preserved unsaved weekly-review text during refresh errors, accessible status text and responsive layout.
- P5 unit/source checks and isolated PostgreSQL RLS/transaction regressions.

Acceptance boundaries:
- No secrets or private portfolio inventory checked in; no live Supabase migrations, deployments, GitHub App registration, or physical device signoffs.
- P1 real Auth two-user and device/accessibility acceptance remain separate.
- P6 proposed: Evidence-Based Release Preparation & Device Acceptance — authenticated E2E, recovery and operator-reviewed release-readiness, governed environment changes only.
