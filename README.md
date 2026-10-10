# THIEPN Control

A **private personal project portfolio and next-action dashboard**, built to answer:
**Which project should I focus on, and what should I do next?**

 > Status: **C4 private-owner/source corrections in draft, not deployed or owner-accepted**. GitHub source is public, so private project inventory, credentials and source evidence are never committed. The app cannot show a live portfolio until an independently approved private Supabase backend is configured.

## Core user experience

- **Command**: one recorded next action (your weekly focus first, otherwise an explainable recommendation), three focus slots, inbox triage. During partial outages it shows the manually selected focus only and clearly labels unavailable evidence.
- **Portfolio**: search, sort, update state/priority/deadline, set a concrete next task, reorder and choose focus.
- **Progress**: real weighted milestones, separate self-reported and verified progress, named development phases and target definitions.
- **Import review**: discover public GitHub repositories by owner in pages, select multiple candidates, manually create an inbox project and link repositories to it individually. Authorized private GitHub App lookup is restricted to an explicitly configured Control owner. Advanced single-repository and bulk JSON intake remain.
- **Priorities**: deterministic, inspectable suggestions; no automatic overwrite of owner priority.
- **GitHub & Review**: read-only verified event ingestion/reconciliation (once authorized GitHub App is configured), weekly reflections, audit history.

The original scope is defined by [product brief](docs/01-brief-and-journeys.md) and [P0–P7 roadmap](docs/08-roadmap.md). Read [C1 rescue](docs/26-c1-mvp-recovery.md), [C2 onboarding](docs/27-c2-onboarding.md) and **[C3 authorized acceptance instructions](docs/28-c3-private-acceptance.md)**. P7–P17 governance expansion is out of MVP scope; all older draft PRs are preserved without modification.

## Technology and local development

Next.js 16 / React 19 / PostgreSQL + Supabase Auth/RLS. Server-side owner-checked RPC writes and one owner-only browser read role; max three weekly focus slots enforced in database transactions.

```sh
npm ci
cp .env.example .env.local
# supply keys for an independently authorized isolated Supabase project; never commit .env.local
# pre-create the approved Auth user and set CONTROL_ALLOWED_OWNER_IDS to their Supabase Auth UUID
# all other sessions are denied; email magic links never auto-register new users
npm run typecheck
npm test
npm run build
npm run dev
```

Database SQL is under `db/`; do **not** apply it to any existing production or shared THIEPN Account/Core database. The application displays a configuration screen until an authorized Supabase backend is supplied.

## Validation and acceptance

The branch CI checks TypeScript, Node unit/source tests, a Next.js production build, and independent runner-local PostgreSQL/RLS regressions. See the exact CI runs on the C4 draft PR for the current count. **These do not prove Supabase Auth, physical-device usability or a deployed URL.** The mandatory inherited P1 real-Supabase check deliberately fails without an approved disposable project and two real test users; see the C3 acceptance instructions above. No browser/physical results have been fabricated.

## Release blockers

1. Explicit repository privacy decision before storing private project inventory, and a **pre-created Auth owner UUID** in server-only CONTROL_ALLOWED_OWNER_IDS; all other browser/API sessions denied by default.
2. Fresh **disposable** Supabase project, reviewed schema and live two-user authentication/RLS/concurrent-write qualification. P1 CI intentionally fails without these independent credentials/authorization; unit tests and isolated PostgreSQL are not substitutes.
3. Owner-approved runtime configuration, and optional read-only GitHub App installation for private repository lookup / reconciliation.
4. Real authenticated desktop/mobile browser QA, owner confirmation of daily Command/Portfolio/Progress flows, and explicit deployment authorization.

No P7–P17 external witness/custody gates were introduced by C1–C4. No merge, deployment, live database migration, real account provisioning, physical acceptance or private inventory import has been performed.
