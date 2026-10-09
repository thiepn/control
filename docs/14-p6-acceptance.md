# P6 — Release Evidence, Browser Testing and Device Acceptance

P6 is a stacked development branch. It is not deployed. Never use production THIEPN Account/Core for tests.

## Evidence matrix — no fabricated signoff

| Gate | Test approach | Actual status |
|---|---|---|
| TypeScript, unit, production build | GitHub Actions exact head | Inspect run jobs |
| Owner RLS and weekly-review race | Real runner-local PostgreSQL | Fixture only, not Supabase Auth |
| Desktop Chromium | Real browser, intercepted synthetic-only API | Fixture only |
| Mobile Chromium viewport | Pixel viewport emulation | NOT physical Android |
| Authenticated independent A/B accounts | Opt-in disposable Supabase + 2 browser states | NOT COLLECTED |
| iOS Safari and Android hardware | Human/operator physical tests | NOT COLLECTED |
| NVDA and VoiceOver | Human screen-reader testing | NOT COLLECTED |
| Live GitHub App integration | Approved isolated staging | NOT TESTED |
| Merge, migration and deployment | Explicit operator approval | NOT AUTHORIZED |

## Synthetic Chromium fixture

The actual React OperationsWorkspace mounts only under server-only
CONTROL_P6_FIXTURE_MODE=ISOLATED_BROWSER_CI. It uses synthetic API interception.
No private owner data, secrets, access tokens, or real-account traces are uploaded.
The fixture cannot prove real Auth or physical device acceptance.
Use npx playwright test --config=playwright.config.mjs after installing the pinned
Playwright package and Chromium, building Next.js, and starting its guarded fixture.

## Opt-in two-account real Supabase browser qualification

Create a **separate authorized disposable Supabase project** and two independently
authenticated users. Keep session storage JSON files **outside Git**.
Set CONTROL_TEST_DISPOSABLE=I_ACKNOWLEDGE_DISPOSABLE_PROJECT,
CONTROL_TEST_SUPABASE_URL, CONTROL_TEST_PUBLISHABLE_KEY,
CONTROL_TEST_SERVICE_KEY, CONTROL_P6_REVIEWED_SUPABASE_HOST,
CONTROL_P6_USER_A_STORAGE, CONTROL_P6_USER_B_STORAGE.
Then run node scripts/p6-auth-preflight.mjs, build with the authorized test public
Supabase URL/key, and run npx playwright test --config=playwright.auth.config.mjs.
Never use THIEPN Account or THIEPN Core.

The suite checks true owner-A/B authentication, cross-account row/API/audit
separation, forbidden origin, cookie revocation and disposable row cleanup.
This suite is excluded from default synthetic CI.

## Operator physical acceptance — all OPEN

- [ ] Physical Android Chrome: sign in, read/write, mobile orientation, touch
- [ ] Physical iOS Safari: sign in, background/resume and recovery
- [ ] NVDA: labels, status, modal focus return and audit disclosure
- [ ] VoiceOver: same keyboard/screen-reader semantics
- [ ] Offline interruption: draft preservation without false success
- [ ] Two-device session revocation and conflict recovery
- [ ] Real A/B private-data isolation and rollback evidence
- [ ] Operator explicitly signs source SHA and deployment/migration plan

## Nondeploying release rehearsal

node scripts/p6-rehearsal.mjs generates a source-bound SHA256-verifiable manifest,
unsigned handoff, and explicit NOT_COLLECTED or NOT_SIGNED device/operator fields.
Do not count this as a released binary or live acceptance.

### Rollback and recovery

No production migrations or binaries are applied in this rehearsal. Rejecting the
candidate leaves the previous deployment intact. A future authorized real migration
requires independent backup, reversible migration plan and operator approval.
If browser data recovery fails, preserve unsaved review text and stop destructive
actions instead of retrying blindly.

## P7 planned

P7 — Staging Qualification, Device Evidence and Release-Candidate Closure:
disposable two-user Supabase acceptance, physical hardware evidence intake,
browser performance and accessibility hardening, rollback certification,
exact-artifact release candidate review and explicit operator signoff.
