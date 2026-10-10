# C5 — Session and weekly-objective isolation (nondeploying)

**Source-only C5, not real external acceptance.** This branch is stacked on C4 draft PR #21 at exact qualified head `89254d736fc76df4d98e5f5e5c64d5f6541218ff`.

Two C4 source defects directly affecting private first use were reproduced by inspection and guarded tests:

- Progress used one `objective` state for every displayed historical focus week. Editing one focus caused another week's field to display the same text; setting it to an empty string restored the persisted text, blocking correction. C5 scopes drafts to the exact (project ID, week) pair, preserves drafts on write failure, and resets only the submitted draft on successful API acknowledgment.
- Dashboard had no subscription to cross-tab Supabase session events. When an approved owner signs out or a different account signs in elsewhere, the current page could continue displaying retained previous-owner project data until manual reload. C5 compares browser session events with the *exact server-authorized owner ID*, clears local owner-bound state, and returns to the server-guarded home route on owner switch or signout. The listener is cleaned up. This is source hardening, not independently verified browser execution.

The official Supabase reference describes browser `SIGNED_OUT`, `SIGNED_IN`, `TOKEN_REFRESHED`, `INITIAL_SESSION` and listener cleanup: https://supabase.com/docs/reference/javascript/auth-onauthstatechange.

## Still blocked: independent real environment

Connected THIEPN Supabase lists **THIEPN Account** and **THIEPN Core** only. Neither has been approved as a disposable Control environment. No user credential, protected data, test-only provider resource, or deployed URL has been created/read or modified here.

**Owner's minimum next action:** explicitly authorize/provision a **separate disposable Supabase project for Control**, with reviewed schema permission and two genuine independently provisioned disposable Auth users. Configure `CONTROL_ALLOWED_OWNER_IDS` for the approved two UUIDs in the *isolated* instance, not public GitHub source. Then use the protected `tests/p1-live-rls.mjs` qualification, genuine owner-bound REST/write/read-back, and physical desktop/mobile browser acceptance as set out in `docs/29-c4-private-first-use.md`. Remove tester B from the production allowlist after acceptance. This approval does not authorize a merge, production deploy or migration.

Do not substitute CI, mocked session events, or runner-local PostgreSQL for live Supabase Auth/RLS and real-device results. The inherited P1 qualification gate remains mandatory and cannot be waived.
