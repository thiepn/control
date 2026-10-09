# Sync, security, provenance and API architecture

## Planned stack, not yet installed

Responsive TypeScript app (Next.js candidate), Supabase PostgreSQL/Auth, server-only GitHub App and webhook handler, optional AI proposal worker, background reconciliation runner. P0 contains architectural contracts only; no live Supabase project created or schema applied.

## Trust model

1. Browser sends session to server, never GitHub private key, Supabase service key or AI key.
2. Server validates Supabase identity on every request. Authorization derives from authenticated user ID, **not client-provided owner ID** or user-editable metadata. Every query/write scoped by authenticated owner.
3. Browser's authenticated role is **SELECT only**, guarded by row-level security. All writes go through authenticated, rate-limited, schema-validated server endpoints with explicit ownership checks and transaction boundaries. Server's secret credential is environment-only.
4. AI reads only intended project metadata and evidence. AI output is untrusted proposal JSON. AI has no direct DB mutation or GitHub merge permission.
5. Sync worker verifies GitHub webhook HMAC SHA-256 on raw bytes, installation/repository authorization, supported event type, event delivery ID, and allowable project associations. Queue + idempotent upsert; only worker may insert verified evidence. Reject unverifiable claims.
6. GitHub App is initially minimal read-only metadata, contents as needed, PR/actions/checks/releases; no repository write grants. A repo disappearing or permissions revoked becomes inaccessible/stale, not deleted from historical audit.
7. Private repository identities and PR details stay user-scoped and are excluded from public logs, public source examples, client analytics and uncensored AI transcripts.

## Data source → decisions pipeline

```
GitHub verified events --[signature + app installation]--> inbox
      ↓ dedupe by provider & event ID, store SHA/timestamp
      ↓ batch evidence & exact-head check reconciliation
repo/project facts (verified, never automatically "released")
      ↓ deterministic validations + optional AI explanation
AI proposal table [before/after, evidence IDs, model info]
      ↓ owner accept/reject (version-check transaction + audit)
owner project state and derived read model
```

Reconciliation schedule: interval-configurable; prioritize active/focused and queued CI checks, back off on provider limits. Webhooks for initial near-real-time, scheduled repair for dropped/reordered events. Detect force-push/new SHA: old checks remain historical, readiness resets to awaiting verification. Check GitHub's conclusion/state and required-gate list, not merely job count. Stacked PR base/head chains must be represented.

## Server API proposal (P1/P3)

- `GET /api/projects?query=&view=&cursor=` owner-scoped, paginated
- `POST /api/projects` project creation: validated input, idempotency key, audit
- `PATCH /api/projects/:id` field ownership, optimistic version & audit; no direct verified completion write
- `POST /api/projects/:id/targets` controlled target revision
- `POST /api/focus/:week` atomic max-three assignment & audit
- `GET /api/repositories/candidates` authorized import review
- `POST /api/repositories/decisions` create/link/dismiss explicit reviewed candidates
- `POST /api/sync/github` authenticated webhook handler; never trust owner ID from payload alone
- `POST /api/reviews/:id/decision` accept/reject pending proposal with compare-and-swap project version

All mutations: CSRF strategy appropriate to session, input schema validation, access checks before mutation, transaction, limited payload sizes, stable error codes; use same constraints at DB layer.

## Concurrency and integrity

`projects.version` CAS must reject stale writes (HTTP 409) and show diff/reload. Focus assignment: unique slot + per-project + transactional limit, with user-visible replacement flow. Event ledger deduplicates per `(owner_id,provider,provider_event_id)` and never overwrites an already final verified fact without correction trail. AI proposal stale when its source evidence/target version changes, not silently applied.

## Backup, privacy and reliability

- Access log redaction of private repo names, tokens and source payloads.
- Export owner data in JSON/CSV and import with stable IDs after authorization.
- DB snapshots + restore rehearsal before public launch; retention/backup policy documented at P7.
- Project deletion reversible soft-archive by default. Hard-delete flow explicit confirmation and all attached evidence retention policy.
- Offline cache read-only until secure offline mutation conflict strategy is separately reviewed.
- Launch is private, with security tests: two users cannot read/write each other's objects or link other's repo ID; anonymous requests denied; user-owned attributes cannot claim `verified` without worker evidence.

## Framework/security reference review

Relevant Supabase reference: https://supabase.com/docs/guides/database/postgres/row-level-security . Supabase docs were consulted through connected documentation search on 2026-10-09. Exact framework package versions and Next.js integrations must be checked and pinned at P1; none installed at P0.
