# P11 — Independent Release Evidence Audit & Controlled Closure

**P11 is safe source implementation and CI-only qualification. DRAFT / UNMERGED / UNDEPLOYED.** Every genuine human, physical-accessibility, signer custody, real staging and release signoff is OPEN. No connection to THIEPN Account or Core production is permitted.

## Implemented and independently inspectable
1. External Ed25519 key chronology uses independently supplied root fingerprint, externally pinned genesis and head hashes; every epoch carries an external root signature, and each rotation carries the predecessor custodian's separate signature. Unknown/replayed keys, revocation bypass, forked history, reordered timestamps, expired/future epochs and forged roots fail closed. Synthetic tests generate non-production keys locally; CI never issues real operator credentials.
2. Off-Git operator intake accepts absolute, regular nonsymlink files outside the public repository only when deliberately run by an independent operator. The packet contains signed **metadata digests**, never raw private user evidence. It cannot prove actual physical device ownership or a human observation; it never issues approval.
3. Public CI always generates a 13-prerequisite **DENIED** closure: seven P8 human gates, external trust, source, independent binary evidence, synthetic restore, real authorized disposable Supabase restore and a separately approved release command. All are OPEN. Passing CI does not close them.
4. Fresh locked Next builds run in **two distinct GitHub-hosted jobs** (matrix alpha/beta), with independently assigned runner names, exact commit/tree checks, same deterministic **PUBLIC SYNTHETIC TEST-ONLY** Server Action encryption key derived from the reviewed source SHA, and complete SHA256 lists of every emitted JS/CSS/WASM file in .next/server and .next/static. A **third independent comparison job** downloads both named artifacts and fails if runner identity/source, file paths, contents, provenance or no-release fields disagree. This tests independently hosted GitHub jobs, **not two independently governed organizations, signed SLSA provenance, full release-image reproducibility or a safe-to-deploy key**.
5. Real PostgreSQL runner-local synthetic P0–P7 RLS/parallel write checks plus P9 isolated restore and P11 damaged-backup negative proof. This is NOT an approved real Supabase service backup/restore.
6. Desktop/mobile Chromium synthetic API-fixture accessibility and denied release UI; no real phone, VoiceOver/NVDA or two independently authenticated accounts are exercised.
7. Disposable Supabase recovery **configuration preflight only** requires explicit exact-source, host denylist, two isolated test sessions, short-lived operator approval, no-mutation scope and retention acknowledgment. No real credentials, writes or external endpoints are used.

## Outside CI — independent owner operations (all outstanding)
- [ ] P1 approved disposable Supabase project with real authenticated separate A/B accounts
- [ ] Actual Android Chrome and iOS Safari walkthrough, 200% zoom and touch handling
- [ ] NVDA and VoiceOver actual physical-accessibility reviewer signoffs
- [ ] Independent privacy review and authentic offline/network recovery
- [ ] Explicit permission and plan for disposable service backup and actual verified restore
- [ ] Genuine separate custodian root key, nonce/evidence review, rotation/revocation, independently published immutable anchors
- [ ] Independent organization-level reproducible binary attestation (optional stricter standard)
- [ ] Separate manual release approval, rollback owner and operational abort controls

**No P11 CI test can satisfy a box.** No merge, production migration, cache purge, credential provisioning, deploy or release actions exist in P11.

## P12 — proposed, NOT IMPLEMENTED
P12 — External Acceptance Custody & Independent Recovery Witness: external trust key replacement/compromise chronology, independently signed human/device accessibility packets and rights/privacy provenance, real authorized disposable staging restore evidence capture, release candidate provenance on separately controlled machines, and continued default-denied publication decisions. Never fabricate hardware approvals.
