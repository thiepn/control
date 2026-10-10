# C2 — Backend qualification & real portfolio onboarding

**Scope reset:** C2 follows C1 (PR #18) and the original P0 focus-manager brief. This is source work for practical onboarding, not a release-custody phase.

## Implemented
- Authenticated preview of GitHub public repositories by owner (up to 100/page), or GitHub App installation-authorized repositories (same page limit). No inventory is scraped into source or stored until explicit selection.
- A selected page is re-fetched server-side on POST; only GitHub-confirmed repository IDs/names are accepted for the existing owner-scoped candidate-intake RPC. Duplicate submissions are idempotent in P1 SQL. No repositories become a project automatically.
- Individual review rows can choose **their own destination project** rather than the unsafe single global selector. Existing SQL permits several repositories per project but rejects linking one repository to different projects, linking to archived/foreign projects, and cross-owner access.
- Project inspector shows its currently linked repositories through a read-only authenticated, owner-RLS query; no secret leakage into UI or source.
- Discovery / server-guard / real PostgreSQL tests exercise idempotent intake and grouping.
- C2 CI runs locked typecheck, unit tests, Next build, isolated PostgreSQL P0–P5+C2. It does not assert live Supabase qualification.
- Existing P1 live disposable two-user script remains a **mandatory independent gate**, never skipped/waived for production.

## Practical use after backend has been authorized
1. Review repository visibility: `thiepn/control` source is currently **public**. Keep sensitive portfolio and installation credentials out of repository and CI logs.
2. Provision a **new** approved disposable Supabase Auth/PostgreSQL instance, not THIEPN Account/Core. Deploy reviewed SQL there through an explicitly approved migration, configure 2 test accounts, run `node tests/p1-live-rls.mjs` with the existing `CONTROL_TEST_*` environment variables. No live credentials are currently available in C2.
3. Sign in to the locally run application with the disposable identity, choose Import Review → Discover; search owners one at a time and review candidates. Create project portfolio records, then link repositories to chosen existing projects; for multifile products assign several repos to the same project.
4. For private repositories, explicitly register/install a read-only GitHub App with an authorized installation, and select installation mode. No GitHub App is created or installed here.
5. Verify all Command, Portfolio, Progress and GitHub flows with a **real** authenticated desktop/mobile browser and owner confirmation before any controlled release.

## Exclusions and blockers
No production migration, no private source inventory, no fabricated state/progress/evidence, no automatic project classification, no provider approvals, no merge/deployment, no P7–P17-style extra governance. Real Supabase Auth integration, authenticated browser acceptance and real GitHub installation evidence remain **not collected**. GitHub public API rate limits/pagination and authorized App installation access still apply.
