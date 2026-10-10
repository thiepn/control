# P13 — External Witness Intake & Release Decision Separation

**Source preparation only. Draft, unmerged, undeployed. Never promotes a successful cryptographic audit to a genuine human/device or production release approval.**

## Source implementation
1. Strict chronological dual-custody metadata (observer + independent auditor) for Android, iOS, screen-reader, privacy, source rights, object continuity and restore witness records. Exact source/artifact, rights and object digests, immutable preceding record SHA, unique nonce, independent identities/organizations, non-self-signed separate Ed25519 signatures and out-of-band key fingerprints and head/genesis pins are mandatory. The only accepted classification is \`metadata_only_unverified\`. A valid dual signature proves **cryptographic metadata agreement**, not physical attendance, accessibility acceptance, legal ownership or actual restoration.
2. Explicitly **segregated owner and auditor nonrelease acknowledgments**, with independent public-key pins, source/artifact and trust/witness head pins, short clock TTL and distinct signatures. The sole permitted action is \`REVIEW_ONLY_DENY\`. No branch, API or script can authorize production.
3. Separate-governance build-claim verification enforces two distinct organizations and individually pinned Ed25519 keys with identical reviewed source, tree, selected executable SHA and file count. The only classification is \`external_claim_unverified\`. No actual outside organization, signing key, OCI production artifact or SLSA attestation is present.
4. Strictly offline \`p13-offline-review.mjs\` accepts only an independently retained private bundle outside the public Git tree, separately supplied source/artifact, witness chain head/genesis, trust, executable/tree anchors and operator key signatures. It has no network calls and never outputs private record data. Public CI must not receive this bundle.
5. \`preflightP13Recovery\` builds on P11's authorization configuration with independently reviewed exact disposable origin/source, 2 distinct test sessions, explicit denylist, approved short-lived no-mutation scope, two independent signed nonrelease review acknowledgments. It makes **no database connection** and does not represent actual authorized Supabase operations.
6. Runner-local **real PostgreSQL** synthetic seeded ownership-RLS/parallel transactions, interruption rollback, immutable dump hash, separate isolated DB restore, corrupt backup refusal. This is not real Supabase.
7. Public CI evidence contains a deterministic 18-prerequisite **DENIED** closure. Real Chrome/Safari/NVDA/VoiceOver, rights/privacy, independent witnesses and genuine backed-up service restoration remain uncollected.
8. Existing two GitHub-hosted independent runner exact-head executable comparisons retain 147 selected JS/CSS/WASM files (variable output counts allowed) and a third comparison verifier. They are not independent organizational build certification or a deployable production artifact.

## Operator-controlled external evidence needed — all OPEN
- [ ] Authorized disposable Supabase project; two separate genuinely authenticated test users; independent P1 acceptance
- [ ] Physical Android Chrome and iOS Safari with independent witnessed accessibility observations
- [ ] Actual NVDA + VoiceOver and keyboard, zoom, network recovery
- [ ] Immutable object/source ownership, rights, privacy, CDN/PWA/offline provenance review
- [ ] Externally owned root, rotation/revocation/compromise, custody hash ledger with recorded witnesses
- [ ] Two genuinely independent operators with separate private signing keys and out-of-band trust anchor retention
- [ ] Real authorized disposable Supabase backup, restore, rollback and independent human witness, after operator consent
- [ ] Independently controlled build environment, verifiable production image and supply chain attestations
- [ ] Separate manual owner release/abort/rollback decision, no auto merge/deploy/migrate
- [ ] Explicit release permissions for each production change, never inferred from source tests

All P13 CI and operator scripts are read-only with respect to THIEPN Account/Core production. No secrets, real private evidence, operator root credentials or protected live objects must enter this public repository.

## P14 — next, not implemented
**P14: Independent Human Evidence Reconciliation & Production Gate Isolation.** Strengthen externally governed signer-compromise aftermath, immutable witness record custody with independent reviewer permissions, actual disposable service/physical-device evidence collection support, separate-governance signed binary attestation verification and owner/approver segregation. Retain default DENY for all release and postrelease decisions unless genuine authorization is independently verified.
