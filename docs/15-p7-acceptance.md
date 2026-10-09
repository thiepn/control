# P7 — Staging, Device Evidence and Release-Candidate Closure

State: a stacked development draft. No production migrations, deployment or approvals.

## Automated evidence
- TypeScript, unit tests and locked production build at the exact head.
- P0–P7 local PostgreSQL RLS, receipt ownership/deduplication/audit.
- Actual two-process PostgreSQL review transaction race: one winner, stale conflict, audit.
- Desktop and emulated-mobile Chromium Review tests against synthetic API intercepts.
- Independent SHA256 verification of the exact-head release source manifest.
- Ed25519 operator signoff verifier with tested invalid/missing/expired/wrong-SHA cases; no signing key or approval is provisioned.

## Disposable staging (opt-in only)
Configure CONTROL_TEST_DISPOSABLE=I_ACKNOWLEDGE_DISPOSABLE_PROJECT,
CONTROL_P7_OPERATOR_SCOPE=DISPOSABLE_ONLY, CONTROL_TEST_SUPABASE_URL,
CONTROL_P7_APPROVED_STAGING_HOST, CONTROL_P7_TEST_PROJECT_REF,
CONTROL_P7_DENIED_PRODUCTION_HOSTS, CONTROL_TEST_PUBLISHABLE_KEY,
CONTROL_TEST_SERVICE_KEY, CONTROL_P6_USER_A_STORAGE and CONTROL_P6_USER_B_STORAGE.
Use independent test user storage files OUTSIDE Git. Run
node scripts/p7-staging-preflight.mjs then node scripts/p6-auth-preflight.mjs.
Only after authorization/migration of that independently disposable project,
run npx playwright test --config=playwright.auth.config.mjs.
This is NOT performed by automatic fixture CI. Never use THIEPN Account/Core.

## Device receipts
Authenticated owners may record category, exact source SHA, separate evidence
SHA256 and a short non-sensitive observation. No file uploads, screenshots,
cookies, credentials or private device identifiers are accepted. The receipt
classification is ALWAYS self_reported_unverified and cannot approve release.

## Physical and human evidence still OPEN
- [ ] Physical Android Chrome
- [ ] Physical iOS Safari
- [ ] Actual NVDA / VoiceOver
- [ ] Real two-user Auth and two-device session/concurrency
- [ ] Actual integration reachability and accessibility audit
- [ ] Operator inspection of evidence in private storage
- [ ] Independently signed privacy and rollback decision

## Operator-controlled release decision
The offline Ed25519 verifier checks exact source commit, artifact SHA256,
explicit mandatory gate set, operator identity and a short validity period.
Use scripts/p7-evaluate-operator.mjs with a trusted external public key and
detached attestation/signature files. Self-reported device receipts never
satisfy that signature. Even a valid signature does NOT cause merge, migration
or deployment; separate explicit authorization remains necessary.

Run node scripts/p7-rehearsal.mjs create followed by
node scripts/p7-rehearsal.mjs verify. The manifest remains unsigned,
unapproved, undeployed and linked to every hashed source input.

### Rollback and recovery
No production state changes in rehearsal. Leave candidate draft after failure;
keep currently deployed binary and schema untouched. For any future approved
migration, independently verify backups and reversible SQL first. On offline
write ambiguity, preserve local edits and require explicit user retry; never
silently duplicate a submitted review.

## P8 planned
P8 — Human Acceptance & Controlled Release Decision: actual disposable
Supabase Auth/device signoff, trusted external operator evidence, artifact
reproducibility, rollback approval and explicitly gated final release.
