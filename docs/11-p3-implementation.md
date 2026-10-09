# P3 — GitHub Evidence & Synchronization

Separate stacked draft branch `feat/p3-github-evidence` off P2.

- Signed SHA-256 GitHub webhooks only, raw request-body signature verification, installation restriction and 512 KiB cap.
- Stable delivery-based idempotency in the database using an owner-scoped unique provider event ID; replay does not create second evidence/proposals.
- Normalized, bounded metadata only, never raw webhook payload or private access tokens.
- Owner/repository associations constrain ingestion to explicitly linked portfolio projects.
- App-installation JWT and short-lived installation token for manual authorized and cron-triggered reconciliation of exact-head PRs and workflow runs.
- Exact-head successful CI can create **pending review proposals only** when an explicitly tracked phase SHA matches; never auto-completes a milestone or releases a phase.
- Authenticated evidence dashboard, explicit audited proposal decisions, no implied approval.
- App and PostgreSQL CI fixtures; not deployed, no GitHub App registered, and no migrations on THIEPN production.

Environment for future authorized deployment: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`,
`GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, and optional `CRON_SECRET`.
All server-only. Register the webhook URL `/api/github/webhook` on the first-party GitHub App.
