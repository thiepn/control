# C4 — Private owner and first-use acceptance

**Status: SOURCE QUALIFICATION ONLY — live Supabase Auth/browser acceptance NOT performed.**

C3's qualified head `9a22c1ad715b4d0a6f3ef7c435124b6fdb77f877` is the parent. C4 does not create provider projects, apply migrations, register actual users, upload private inventory, merge, or deploy.

## Demonstrated defects addressed
1. Supabase passwordless login auto-signs-up unknown emails by default: the former Login passed only `emailRedirectTo`. Now `shouldCreateUser:false` prevents surprise registration. [Supabase passwordless Auth documentation](https://supabase.com/docs/guides/auth/auth-email-passwordless).
2. `requireOwner()` previously allowed **any** Supabase-authenticated user through its service-role-backed API writer and Home showed the Dashboard to any signed-in user. Server-only `CONTROL_ALLOWED_OWNER_IDS` now strictly allows only preapproved Supabase Auth UUIDs. Missing/malformed allowlist => login is disabled, API reads/writes denied. For isolated owner A/B browser tests, allowlist both **only in the authorized disposable environment**. Never embed UUIDs or real secrets in public source.
3. Dashboard `execute` previously caught both RPC failures and post-write refresh errors as “Operation failed,” prompting accidental duplicate user submissions. Now separates the write outcome from uncertain later read-back.
4. Newly created null-fraction milestones appeared as `0%`. Now the actual nullable SQL state is displayed as **Unassessed** until the user explicitly reports a value (including genuine 0%).
5. A rejected milestone-create request previously cleared the typed milestone name because `act()` swallowed its error and a `.then()` handler always reset the form. C4 keeps the field intact for a proper retry after error.

## Exact owner actions required (NOT yet approved)
1. Authorize and provision a **separate disposable** Supabase project, distinct from existing THIEPN Account and THIEPN Core. This request does **not** grant permission to create it or charge the account.
2. Review the P0–P5 SQL chain and apply to that **disposable instance only**, with explicit owner approval. Pre-create two **actual** Auth users in it, using only the provider's supported secure user-invitation flow. Do not share their credentials in source or GitHub Issues.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` on a **local or authorized isolated runtime**. Set `CONTROL_ALLOWED_OWNER_IDS` to comma-separated actual Auth UUIDs (one for daily use; both A/B for temporary two-user acceptance). Keep secrets server-side.
4. Invoke existing `tests/p1-live-rls.mjs` with guarded `CONTROL_TEST_DISPOSABLE=I_ACKNOWLEDGE_DISPOSABLE_PROJECT`, and real `CONTROL_TEST_*` in local environment only, not CI public logs. Record owner A/B read restrictions and concurrent update results. No result may be prefilled.
5. Perform real authenticated browser acceptance with a fresh session for **each** allowed disposable user and a nonowner. Confirm:
   - Login with an existing user; unknown email cannot create an account; foreign authenticated user cannot open Dashboard or call project APIs.
   - Owner A creates a disposable inbox project and reads it back, saves next action, selects focus and sees it on Command after refresh.
   - Owner A creates phase P1 and target/milestone; unreported milestone shows *Unassessed*, explicitly reported 25% does **not** become *Verified*. Verify read-back in another browser session.
   - Discover only publicly visible GitHub repositories under a chosen owner, submit selected candidates for review, and explicitly associate two repositories with one project. Verify database link, reject linking already assigned repository elsewhere, and confirm user B cannot see A's candidates/projects/links.
   - Keyboard-only create/edit/select/review, reduced-motion settings, mobile widths, Android/iOS physical scrolling, focus and screen reader labels; **log actual observations**, not synthetic signoffs.
   - Sign out and verify project/focus API GETs return unauthorized; reauthenticate with approved owner and verify persisted records.
6. Owner reviews private hosting and deployment plan and gives a separate explicit instruction to merge/deploy. Existing `main` stays untouched until then.

## Qualification rule
CI's Node tests, TypeScript, Next production build and runner-local PostgreSQL tests prove **source behavior only**. They do not prove hosted Auth/RLS, actual browser/device behavior or ownership of credentials. The unchanged inherited P1 gate must remain failed without authorized disposable credentials. **NO GO** for live launch until the independent real acceptance above passes.
