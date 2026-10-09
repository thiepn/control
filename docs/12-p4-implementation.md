# P4 — Intelligent Prioritization & Recommendations

Implemented in `feat/p4-intelligent-prioritization`, stacked on draft P3.

- Deterministic, inspectable 0–100 score for eligible projects. Each score is accompanied by its additive factor breakdown. Existing manual priority, deadlines, lifecycle, blocked phases, missing next actions and focus state are explicit inputs.
- Berlin-local date calculations; deadline urgency classification, hard-deadline boost, planned/active and blocked/paused adjustments.
- No hidden/paid AI model, fabricated workload estimate, automatically verified evidence, or autonomous priority changes. The interface says that the current engine is deterministic.
- Explicit weekly focus capacity 1–3, preserving existing slots/objectives; blocked/paused projects excluded from new focus suggestions.
- Recommendation queue with fingerprint/idempotency, project-revision guards, owner RLS, service-only SQL writes, actual priority/focus changes **only after explicit approval**, and audit records for both approval and rejection.
- Blocker acknowledgement is advisory; cannot silently unblock phases or mark milestones/release qualified.
- Responsive Priorities workspace with factor lists, queue/approval/rejection controls and live errors.
- Unit, typecheck, build, and disposable PostgreSQL tests.
- No Supabase migrations run, no GitHub App deployment, no live database access, no merge.

P5 planned: Portfolio Insights, Recurring Review & Ecosystem Acceptance — cross-phase summary, audit history, safe review cadence, integration diagnosis, and real authenticated device acceptance.
