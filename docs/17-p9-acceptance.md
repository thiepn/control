# P9 — Operator-Governed Production Readiness

**DRAFT only; not merged, deployed or authorized for release.**
P9 is a code/infrastructure preparation phase, not actual external acceptance.

## P9 implemented evidence channels

1. **Deterministic complete tracked-source handoff**: exact PR branch HEAD and Git tree, clean tracked checkout, sorted SHA256 over every tracked regular file, deterministic independent verifier, SHA256SUMS artifact. This does not prove two independently built Next.js binaries are byte-identical.
2. **Offline independent custody**: P8 ledger verification, external signed Ed25519 checkpoint covering full ledger head/count, exact source and artifact hash, nonce, custodian and externally pinned previous checkpoint hash. Requires an out-of-band known-good key and previous anchor. Neither a P8 local hash chain nor a P9 self-signed checkpoint prevents truncation without independent storage.
3. **Disposable staging configuration gate**: explicit exact source, exact HTTPS project origin, declared production denylist, two independently stored test user sessions, P7 owner review. Configuration-only output; no staging Auth interaction or human signoff inferred.
4. **Runner-local actual PostgreSQL backup/restore**: seeded synthetic runner database; pg_dump custom archive, pg_restore to separate disposable DB, probe mutation, destruction of only the dedicated restore DB and second verified restore from preserved backup, then cleanup. This is neither a real Supabase service backup nor a production rollback.
5. **Browser evidence and release disclosure**: actual Chromium on synthetic API fixtures. Every external gate remains OPEN, even if automated checks pass.

## Operator-controlled execution (never committed)

- External acceptance must be authorized separately for the exact qualified SHA and a specifically reviewed disposable Supabase origin. Configure P7 staging variables **and** CONTROL_P9_APPROVED_SOURCE_HEAD, CONTROL_P9_APPROVED_STAGING_ORIGIN, CONTROL_P9_OPERATOR_SCOPE=DISPOSABLE_STAGING_ONLY and CONTROL_P7_DENIED_PRODUCTION_HOSTS. Run node scripts/p9-staging-preflight.mjs locally; this does not authenticate anyone. The existing P6 real-A/B Playwright suite is opt-in and remains unexecuted until independently authorized.
- For signed external custody, keep P9_LEDGER_PATH, P9_CUSTODY_CHECKPOINT_FILE, P9_CUSTODY_SIGNATURE_FILE, P9_CUSTODIAN_PUBLIC_KEY_FILE, P9_PINNED_PREVIOUS_CHECKPOINT_SHA256, P9_EXPECTED_HEAD, and P9_EXPECTED_ARTIFACT_SHA256 outside the repository. Run node scripts/p9-verify-custody.mjs. Independent custodian signing and publishing an out-of-band checkpoint digest is an external step, **not done by CI**.
- For source handoff only, at exact clean qualified SHA set CONTROL_P9_EXPECTED_HEAD, run node scripts/p9-source-rehearsal.mjs create then verify, independently run sha256sum --check release-evidence/p9/SHA256SUMS. Never store personal portfolio/private operator evidence in these artifacts.

## Acceptance still OPEN

- [ ] Disposable Supabase approved and genuinely authenticated independent A/B users, multi-device conflict, RLS, signout
- [ ] Physical Android Chrome and iOS Safari
- [ ] NVDA and VoiceOver on actual devices
- [ ] Independent privacy and source/object rights review, offline/session recovery
- [ ] Actual authorized disposable Supabase backup/restore under a documented retention/custody policy
- [ ] Genuine independent custodian signed and externally stored hash checkpoint
- [ ] Real staged operator acceptance, separately authorized production decision
- [ ] Explicit release command approval; no automatic merging, migration or deployment

A passing workflow or a self-reported evidence receipt never satisfies any of these checks.
P9 CI must not receive credentials, production hostnames, private evidence, user data or signing keys.

## P10 proposed (NOT IMPLEMENTED)

P10 — Evidence-Gated Release Operations & Human Acceptance Closure:
collect authorized real staging and physical-device acceptance, independently custody-pin signed decisions,
complete a real disposable backup/restore and rollback, verify reproducible release artifact binaries,
then prepare a human-controlled final release decision with explicit dry-run/abort controls.
No merge/deploy until separately approved.
