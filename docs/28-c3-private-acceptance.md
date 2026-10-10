# C3 — Authenticated acceptance and private launch readiness

C3 is a **source hardening and safe acceptance-preparation phase** stacked on C2 PR #19. No production migration or deployment is authorized.

## Demonstrated defects repaired

1. Before C3, `Dashboard` suppresses the entire next-action recommendation whenever `/api/progress` is unavailable, even though its separately authenticated `/api/projects` and `/api/focus` responses are intact. C3 keeps a *manually selected, recorded focus* visible without calculating unverifiable phase readiness or inventing progress.
2. Before C3, the header says **SYNCED TO BACKEND** after load even when authenticated API refresh fails, or phase/repository data is missing. C3 has explicit connecting/connected/partial/error states and a real retry operation.
3. Before C3, onboarding an existing repository requires navigating back to Portfolio to create a project. C3 adds an explicit project-creation form beside candidate review, using the existing authenticated project API; no automatic project grouping.
4. If a database progress write commits but the subsequent dashboard reread fails, C3 no longer mislabels the committed mutation as "Action failed".
5. The repository-review candidate API was a hard dependency of the Command/Portfolio refresh. C3 treats that read as optional, keeps authenticated projects/focus usable when candidate intake is unavailable, and labels the dashboard PARTIAL DATA.

## Real-environment acceptance: NOT COMPLETE

Connected THIEPN Supabase account currently exposes **THIEPN Account** and **THIEPN Core** only. Neither is designated or authorized as a disposable Control environment. No shared/private production SQL migration, project creation, credential extraction, OAuth/Supabase tester provisioning or publishing is performed.

A qualified launch requires:
1. Owner explicitly designates and authorizes a *fresh disposable* Supabase instance, separate from the two existing products. Apply reviewed `db/schema.sql`, `db/p1-app.sql`, ... `db/p5-reviews.sql` there only after schema review. Never apply them to THIEPN Account/Core.
2. Use **two actual independent Auth accounts** and run the existing guarded `tests/p1-live-rls.mjs` with `CONTROL_TEST_DISPOSABLE=I_ACKNOWLEDGE_DISPOSABLE_PROJECT` and the `CONTROL_TEST_*` environment variables (secret values entered locally, not committed). No test should claim success until it observes actual authenticated RLS, concurrency, write and read-back.
3. Run genuine browser acceptance against the authenticated local Control build: anonymous redirects to sign-in, invalid/cross-origin writes denied; create a real disposable project, set a next action, focus it, refresh, report a milestone and verify both reported vs verified percentages, add a **public** repository for review, link it to the correct owner project, verify another user cannot see it; test keyboard, phone viewport and sign-out. Record observed outcomes, not manufactured screenshots.
4. For optional **private** GitHub App usage, set `CONTROL_GITHUB_ALLOWED_OWNER_ID` to the authorized owner Supabase UUID and configure server secrets. Test authorized and unauthorized accounts separately.
5. Confirm source/hosting privacy choice, obtain explicit operator deployment authorization, and only then plan controlled migration/release.

## C3 CI vs real acceptance

C3 CI runs locked dependency install, TypeScript, existing and new adversarial unit/source tests, production Next build and isolated PostgreSQL security tests. These tests establish source correctness, not live authentication or physical device signoff.

Do not treat P7–P17 governance drafts as MVP prerequisites. Keep all prior PRs and `main` unchanged.
