# P12 — External Acceptance Custody & Independent Recovery Witness

**Stacked draft source implementation, not genuine human acceptance or release approval. All release paths remain default DENIED.**

## Implemented
- An externally root-pinned, Ed25519-signed **compromise, recovery, rotation and revocation chronology** checks source/artifact digests, monotonic times, unique nonces, evidence hashes, immutable previous-event hashes and out-of-band root/genesis/head SHA-256 pins. Synthetic unit signers are generated only in ephemeral tests. No real operator root key or authorization was created.
- Independently signed **device/physical/accessibility, source/object rights and privacy metadata**. Each record binds source SHA, output artifact, immutable object bytes digest, rights digest, observation time, nonce and previous record hash. It checks metadata authenticity, **not actual ownership, copyright license, accessibility testing, device custody, CDN publication or offline client acceptance**.
- Read-only **disposable recovery and separate-governance build witness** validation with independent out-of-band witness public-key digest, custody anchor and signature. A valid signature is not an actual Supabase restore report; external testing and independent organizational attestation are UNCOLLECTED.
- Strictly offline operator audit using private files outside the public Git repository and explicit independently supplied head/artifact/root/genesis/witness pins. Never run with CI secrets. Does not authorize release or inspect private objects in CI.
- Synthetic runner-local real PostgreSQL RLS, concurrency, source snapshot, rollback after an interrupted mutation, SHA-256 preservation and corrupt archive rejection; no real or remote database accessed.
- Read-only release UI preserves inherited P8 seven mandatory human gates, with 16 distinct P12 release prerequisites OPEN. Browser runs use real Chromium desktop/mobile **with only synthetic API fixtures**.
- P11 two distinct GitHub-hosted build workers plus a third-worker exact-head file comparison (selected JS/CSS/WASM only, synthetic PUBLIC key; no production release-image or separate-governance machine attestation).
- Public CI attests pristine source and a 16-gate default-denied P12 closure; no human signoff, external rights grant or physical device approval can be inferred.

## Independent manual acceptance prerequisites — ALL OPEN
- [ ] P1 authorized real disposable Supabase project and independent A/B Auth sessions
- [ ] Physical Android Chrome and iOS Safari, actual device zoom/keyboard/Touch acceptance
- [ ] NVDA + VoiceOver real-device accessibility signoff
- [ ] Independent user privacy and immutable object/source rights/copyright review
- [ ] Actual external provenance for CDN/PWA/offline service and incident recovery
- [ ] Genuine operator-controlled root, revocation/compromise event chronology, out-of-band audit hash pins
- [ ] Real authorized disposable Supabase backup/restore, independent human recovery witness and rollback signoff
- [ ] Separate-governance release-image reproduction (GitHub-runner byte comparisons are not this)
- [ ] Separate manual owner release decision, abort/rollback owner and change approval

A successful signature check proves only the authenticity of signed metadata, and neither creates nor verifies a physical act or rights ownership. Do not upload private reviewer files, credentials, real devices or human witness packets to public GitHub Actions.

## Operator-local handling
Run \`node scripts/p12-offline-audit.mjs\` only with approved independently retained private packet **outside the public repository**, externally pinned exact source SHA, artifact SHA-256, root/genesis/incident head, provenance genesis/head and witness key/custody hashes. CI rejects private evidence; no network access occurs. No release actions are supported.

## P13 — proposed, NOT IMPLEMENTED
**P13: External Witness Intake & Release Decision Separation.** Narrow genuine human/device/rights acceptance handoff and independent operator audit, verify authorized disposable restoration only with explicit independent permission, strengthen independent build evidence/incident recovery continuity, and retain a separately default-denied production decision. No merge/deploy/migration without authorization.
