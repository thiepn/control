# THIEPN Control

A **private personal project portfolio and next-action dashboard**, built to answer:
**Which project should I focus on, and what should I do next?**

> Status: C1 MVP rescue source implemented and tested, **not deployed**. This GitHub repository is **public**, so no private inventory or credentials are committed. All project data belongs in an independently configured owner-authenticated backend, never in source.

## Core user experience

- **Command**: one next action (your weekly focus first, otherwise an explainable recommendation), three focus slots, inbox triage.
- **Portfolio**: search, sort, update state/priority/deadline, set a concrete next task, reorder and choose focus.
- **Progress**: real weighted milestones, separate self-reported and verified progress, named development phases and target definitions.
- **Import review**: paste a public `owner/repo` or GitHub URL for safe GitHub identity resolution; link to an existing project only after approval. Authorized private GitHub App lookup is optional. Advanced bulk JSON intake remains.
- **Priorities**: deterministic, inspectable suggestions; no automatic overwrite of owner priority.
- **GitHub & Review**: read-only verified event ingestion/reconciliation (once authorized GitHub App is configured), weekly reflections, audit history.

The original scope is defined by [product brief](docs/01-brief-and-journeys.md) and [P0–P7 roadmap](docs/08-roadmap.md). [C1 recovery and minimum launch path](docs/26-c1-mvp-recovery.md) supersedes P7–P17 governance expansion for the **MVP**. Those older draft PRs are preserved as history, not dependencies.

## Technology and local development

Next.js 16 / React 19 / PostgreSQL + Supabase Auth/RLS. Server-side owner-checked RPC writes and one owner-only browser read role; max three weekly focus slots enforced in database transactions.

```sh
npm ci
cp .env.example .env.local
# supply keys for an independently authorized isolated Supabase project; never commit .env.local
npm run typecheck
npm test
npm run build
npm run dev
```

Database SQL is under `db/`; do **not** apply it to any existing production or shared THIEPN Account/Core database. The application displays a configuration screen until an authorized Supabase backend is supplied.

## Release blockers

1. Explicit repository privacy decision before storing private project inventory.
2. Fresh **disposable** Supabase project, reviewed schema and live two-user authentication/RLS/concurrent-write qualification. P1 CI intentionally fails without these independent credentials/authorization; unit tests and isolated PostgreSQL are not substitutes.
3. Owner-approved runtime configuration, and optional read-only GitHub App installation for private repository lookup / reconciliation.
4. Real authenticated desktop/mobile browser QA, owner confirmation of daily Command/Portfolio/Progress flows, and explicit deployment authorization.

No P7–P17 external witness/custody gates are introduced by C1. No merge, deployment, live database migration, or private inventory import has been performed.
