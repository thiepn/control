# R5 — Source refresh protocol and auditable status
Date: 2026-10-11. Scope: dedicated Control Worker/D1, connected owner ChatGPT automation, public GitHub repository metadata. No paid AI API.

## Real write protocol
1. **Discover** repositories through connected GitHub, not a guess based on a static 87-item list. Compare against D1 projects; insert only genuinely new repo URLs under thiepn with a fresh UUID and leave priority and progress null.
2. **Begin a run** with globally unique run ID in refresh_runs (scheduled or supervised). A duplicate ID must not process the same run again. Audit start is NOT proof of completion.
3. **Read current revisions** from source_observations (0 if absent) and project_reviews/focus_recommendations (refresh_version). Query GitHub PR head, CI conclusion, default branch and last pushed timestamp. Validate source URLs for the same repo.
4. **Build deterministic fingerprint** in the same canonical order used by src/refresh-engine.js: JSON array of repo_url, default_branch, main_sha, latest_pr_number, latest_pr_head, latest_ci_id, latest_ci_conclusion, last_pushed_at. Do not include observation/check time. The owner-connected task can use source_observations SQL UPSERT with WHERE revision=<observed_revision>. On stale revision (0 changes), reread, reconcile, retry ONCE without forcing and report conflicts if unresolved.
5. **Write only verified semantic changes** to project_reviews with WHERE refresh_version=<observed_version>; update refresh_version + 1, refresh_run_id and cited evidence in the same SQL UPDATE. Never touch owner project priority, progress, protected data or release approval. Log is created automatically by the D1 trigger on review version changes.
6. **Reconsider R4** only when new evidence changes the next useful action, urgency lane or a verified prerequisite. Update at most the affected existing focus rank using WHERE refresh_version=<observed_version> with refresh_version + 1 and refresh_run_id. Source-linked rationale is mandatory. Do not automatically reorder/replace the whole shortlist without an atomic multi-slot method; leave a candidate in notes instead. Do not invent dates.
7. **Finish the run** with checked/changed/discovered/focus counts and a status of succeeded, partial or failed. Count only changes accepted by SQL. Never assert success on zero changes caused by a conflict. If a source cannot be fetched, mark partial/failed; preserve last good data.

## Schema
- refresh_runs: run identity, status, evidence note and verified counters.
- source_observations: last source metadata, deterministic fingerprint, CAS revision, last checked time.
- refresh_events: immutable triggers for observations, review updates, focus updates and newly discovered repositories.
- Added refresh_version / refresh_run_id to project_reviews and focus_recommendations; owner project priorities and progress unchanged.
- These are additive migrations in migrations/0006_refresh_audit.sql. Code in src/refresh-engine.js validates input and executes per-record atomic optimistic CAS. ChatGPT connector operations use equivalent SQL; no browser-side editing route or external web hook is exposed.

## Freshness & visibility
- Owner-gated GET /api/refresh summarizes 12 recent runs, up to 1000 source observations and 50 audit events. The Intelligence and Activity tabs show actual run state. High priority (P0/P1) source metadata is overdue after 7 days, other projects after 30 days. **Not yet tracked** is distinct from stale and from a substantive AI review.
- The initial supervised bootstrap can check a subset of five projects and must label itself supervised, not as proof the daily automation already ran.
- The daily ChatGPT Control task is scheduled via the native scheduler and connected GitHub and Cloudflare tools. No embedded model/API key, scheduled Cloudflare cron or external provider billing. This task's first actual scheduled execution has not yet been observed; always report that honestly.

## Limits and R6
- Per-record CAS writes + SQLite audit triggers resist concurrent overwrite and produce source-link history. There is no globally atomic full-five shortlist replacement; R6 can add a transactional snapshot/candidate workflow and correction UI/history, backed by actual tests.
- This phase does not prove live owner browser testing, external rights/physical approvals or hands-free scheduled task success before the task runs.
