# THIEPN Control

An evidence-first, private-by-design project portfolio dashboard. **P1 is in development and not qualified or deployed.**

## Core architecture

- Next.js App Router / React 19, server-validated Supabase Auth and a compact responsive Command + Portfolio + Import Review UI.
- Owner RLS: browser may read its own rows. Authenticated browser cannot write verified evidence or audit history.
- Mutations go via server-only service credential and transactionally audited PostgreSQL functions, with version conflict handling.
- The focus model permits at most three projects per week. Completion is unassessed until verified milestones exist (P2).
- GitHub source repo may be public; personal/private repository inventory is never committed.

## Current status

The connected GitHub repository `thiepn/control` was newly created **public**, despite P0's private-repo requirement. No credentials or private inventory are included. P1 remains unqualified until the repository visibility decision, pinned dependency lock, real database and two-user integration verification, browser accessibility testing, and exact-head CI gates close.

## Local setup (after registry/network access is available)

1. `npm install` (generate and commit `package-lock.json` before requesting full certification).
2. Create a **separate disposable Supabase project**; review `db/schema.sql` and `db/p1-app.sql` and test RLS there. Never run these SQL files against an existing project without explicit approval.
3. Copy `.env.example` to `.env.local` and configure Supabase public URL/key and server-only secret.
4. `npm run dev`; `npm run typecheck`; `npm test`; `npm run build`.
5. Configure required GitHub Actions secrets for two-user live RLS verification. Never configure against production.

## P0 history and contracts

- `docs/01-brief-and-journeys.md` through `docs/08-roadmap.md` are the P0 design and security contracts.
- `docs/09-p1-development.md` documents the exact P1 scope, gaps, and verification blockers.
- `design/prototype/index.html` remains the prior non-persistent design reference.
- `tests/p1-rules.test.mjs` and `tests/p1-security.test.mjs` are dependency-free source/policy checks, **not substitutes for live RLS**.

**Not performed:** production migrations, deployment, release, merging, private inventory publication, human acceptance, or P2 implementation.
