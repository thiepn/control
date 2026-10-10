# P8 — Human Acceptance & Controlled Release Decision

Status: DRAFT / UNMERGED / UNDEPLOYED. Real hardware, user Auth and independent operator gates are NOT COLLECTED.

## Automated, exact-head qualification
- Locked Node/TypeScript unit suite and Next.js production build
- Runner-local P0–P7 owner RLS and parallel PostgreSQL conflict, never real Supabase
- Chromium desktop and mobile emulation with synthetic Review and Release UI and a11y smoke
- Independently verified release manifest with 16 source inputs and exact PR branch head
- Memory-only backup/rollback simulation clearly stating no live backups or migrations
- Ed25519 external operator decision verifier and local append-only review ledger tests

## Distinguish real acceptance
- [ ] Approved disposable Supabase, independent authenticated A/B users and cross-device conflicts
- [ ] Physical Android Chrome
- [ ] Physical iOS Safari
- [ ] Real NVDA and VoiceOver screen-reader walkthroughs
- [ ] Network recovery, session revocation and concurrency on real staging
- [ ] Private provenance evidence inspected by human
- [ ] Real backup restore and independently reviewed rollback
- [ ] Approved external Ed25519 operator identity and trusted key custody
- [ ] Explicit separate production release approval

Automated green checks and SHA256-only self-reported receipts do not satisfy any real-world box.

## Staged two-account acceptance
Use existing P7 offline disposable staging preflight and P6 genuine two-account Playwright
suite. Configure reviewed disposable test project ONLY with separate A/B session data
stored outside the repository. Never run against THIEPN Account or THIEPN Core.
P8 CI never provisions test users, claims physical screenshots or tests live Auth.

## Offline signed operator review ledger
Set P8_OPERATOR_ATTESTATION_FILE, P8_OPERATOR_SIGNATURE_FILE,
P8_TRUSTED_OPERATOR_PUBLIC_KEY_FILE, P8_LEDGER_PATH,
P8_EXPECTED_ARTIFACT_SHA256 and P8_EXPECTED_HEAD. Keep all outside the public Git
repository. A trusted operator independently signs canonical JSON binding the exact
source commit, artifact SHA256, nonce, identity, 7 mandatory gate digests, decision,
and a maximum 1-hour validity window.
Run node scripts/p8-record-decision.mjs only with externally authorized inputs.
Ledger writing is atomic under a single-writer lock and refuses nonce replay.
It never merges, migrates, deploys or signs its own approval. Protect the local ledger
against truncation/deletion using external tamper-evident custody; a local hash chain
is not an independent append-only service.

## Nondeploying source and rollback rehearsal
Set CONTROL_P8_EXPECTED_HEAD to exact qualified branch SHA. Run
node scripts/p8-rehearsal.mjs create
then node scripts/p8-rehearsal.mjs verify.
CI also verifies SHA256SUMS. The manifest says unapproved and
includes an immutable synthetic rollback proof only. No live backup or restore
is represented as complete. Rejected candidates keep previous production untouched.

## P9 proposed
P9 — Operator-Governed Production Readiness: obtain real approved staging/device
and privacy acceptance, verify real backup/recovery in a disposable environment,
independent operator signing custody, anti-truncation ledger anchoring, and draft
a manual release proposal under separate explicit authorization. Not started.
