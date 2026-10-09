# P1 — Core Dashboard & Portfolio CRUD: build contract

## Status

P1 **not started**. P0 static prototype is a design probe, not a live CRUD app.

## Scope

1. Create a **private** `thiepn/control` repository (operator step: connected tools cannot create it), import P0 **tracked** foundation files only. Keep `data/private/**` off Git.
2. Set up Next.js + TypeScript with exact verified dependency versions and lockfile, type-safe API contracts, styling tokens and baseline test runner.
3. Private Supabase project, owner-only authentication, verify two-user RLS isolation and authenticated server mutations. Use reviewed migration generation; do **not** run P0 schema draft unreviewed.
4. Implement Command, Portfolio, project detail, import-review queue; seeded sample content has no invented progress/deadlines.
5. CRUD: create/edit/archive (not destructive delete) projects; accept/dismiss/link candidate repos; multi-repository association; search, filter, sort, saved preferences, keyboard reordering, focus max-three.
6. Project pagination and list virtualization or verified performant alternative for 100+ rows.
7. Desktop/tablet/mobile responsive design and accessibility. No generic SaaS hero, gradients or fake analytics.
8. Basic export/import and optimistic concurrency (`If-Match` / version) plus audit provenance for every write.

## Automated acceptance

- Node and TypeScript clean, pinned lockfile, lint, unit, build, E2E for core flows.
- Integration tests ensure anonymous, wrong-owner, and revoked sessions cannot read/write records. Forged owner IDs ignored/denied, credentials absent from browser bundle.
- Project CRUD: successful owner update; double-write 409 conflict; attempted overwrite of verified fields denied; audit entry present.
- 86 repository snapshot can enter import review with none auto-marked active. Private data never committed or leaked.
- Sorting does not mutate user manual rank; user can reorder with keyboard and pointer; filter + restore retains intent.
- `completion=null` displays Unassessed; dates absent until set; no auto-assigned deadlines.
- Focus cap 3 enforced at database and API boundaries, including concurrent requests.
- At 390px and 1280px, no primary content inaccessible; 200% zoom and keyboard navigation pass critical task flows.
- Tests do not require external GitHub API access when running local unit tests; use deterministic fixtures.

## Human-only acceptance

- Owner signs off priority definitions, candidate grouping, type scale, visual direction and focus policy.
- Verify keyboard + touch behavior on physical browser/device; verify non-generic visual identity.
- Verify hosted auth redirect/domain/OAuth registration only when prepared for deployment. No merge/deploy before approval.

## Out of scope until P3–P6

GitHub webhooks, live CI reconciliation, AI recommendations, automated proposals, ChatGPT integration, production custom domain, releases. P1 may import GitHub metadata but must not invent authenticated live sync.
