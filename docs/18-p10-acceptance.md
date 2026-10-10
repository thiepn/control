# P10 — Evidence-Gated Release Operations & Human Acceptance Closure

**Implementation-only qualification. Draft / unmerged / undeployed. All actual human acceptance remains OPEN.**

## Source, automated safety and evidence
- P10 never has a merge, deployment, publication, production migration or actual rollback endpoint.
- Seven mandatory P8 human gates are source/artifact-bound and validated ONLY with externally supplied trusted Ed25519 public keys and independent per-gate signed review attestations. Signatures make evidence eligible for independent *manual review*, not eligible for automatic release. Self-reported receipts are never accepted.
- P10 custody continuity separately verifies two complete P9 custodian signatures, out-of-band externally pinned previous checkpoint hash, ledger prefix/full chain, strictly increasing entry count/time, distinct nonces, and anti-truncation.
- Exact-head P9 reproducible source manifest is independently verified before build tooling may alter generated files.
- Separate locked-install Next.js production builds use one ephemeral runner-local 32-byte Server Action encryption key for both builds (never committed, logged or reused for production); they compare **every emitted JS/CSS/WASM file in .next/static and .next/server** with SHA256; excludes source maps, images, build caches, runtime environment, and full OCI image. This is deliberately scoped, not general byte-for-byte production release reproducibility.
- Runner-local actual PostgreSQL dump/mutate/restore applies only to disposable test DB; never actual Supabase staging/production.
- Actual Chromium desktop and mobile emulation use intercepted synthetic fixtures, not physical phones or genuine real-auth sessions.
- Local read-only review handoff with all 7 human gates OPEN, custody/source/binary/restore release prerequisites open, and separate release command OPEN. Every release decision defaults to DENY even if all artificial test signatures exist.

## Authorized disposable staging: external human prerequisites
1. Independently approve and document the exact current P10 SHA and the explicitly disposable test Supabase origin, including production-host denylist. Never use THIEPN Account or THIEPN Core.
2. Use P9's \`qualifyP9Staging\` and existing P6 genuine A/B authenticated browser acceptance suite **only after** independently obtaining authorized separate-user session state and operator consent, and retain all private session state outside Git. No real Auth test has been executed in this phase.
3. Verify real owner RLS, client session revocation, optimistic concurrency, isolated cleanup and evidence custody. Review logs privately; do not upload session traces to public Actions.
4. Independently perform physical Android Chrome and iOS Safari, NVDA and VoiceOver, network offline/recovery and privacy reviews, with source- and artifact-bound signed receipts stored privately. No P10 CI run can satisfy these.
5. A separately approved, disposable Supabase backup/restoration dry run (not P9 local Postgres) must be performed with dedicated disposable data and independently reviewed before any human gate can be marked satisfied.
6. An independently controlled custodian must issue and retain a real Ed25519 chain and out-of-band anchor. Synthetic test signers are not real operator keys.
7. A separate human release authorization and explicit production command would be needed even after the above. This repository provides **neither**.

## Actual acceptance and release checklist (all uncollected)
- [ ] Authorized disposable two-user Supabase real Auth and cross-owner rejection
- [ ] Physical Android and iOS signoff
- [ ] Genuine NVDA and VoiceOver signoff
- [ ] Offline/recovery and user lifecycle checked on real devices
- [ ] Independent privacy and source rights review
- [ ] Real authorized disposable Supabase snapshot restore and rollback approval
- [ ] Independent externally pinned signed custody checkpoint continuity
- [ ] Separate human production release decision with abort/rollback owner signoff

## P11 planned; NOT IMPLEMENTED
P11 — Independent Release Evidence Audit & Controlled Closure: reconcile genuine operator-supplied off-Git evidence, external immutability and key rotation, independent build provenance on distinct runners, adversarial restoration, and a wholly manual gated release decision. Preserve all outstanding approvals as OPEN until validated.
