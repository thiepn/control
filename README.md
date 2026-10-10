# THIEPN Control — simple private project dashboard

**Current state:** minimal Cloudflare Worker + D1 + static browser UI, independent of previous Supabase draft PRs. **Not deployed.** No production database was created or changed.

A personal dashboard for project name, **manual completion 0–100%**, priority P0–P3, status, next action, GitHub link and notes. Search, sort, filter, edit, delete, bulk import GitHub owner/repository names, and download JSON backup. No AI estimates, no custom accounts, no Supabase.

### One-time owner setup (Cloudflare Free)

1. In your **own Cloudflare account**, keep thiepn.dev's DNS where it already is. Create a **new Cloudflare D1 database** called thiepn-control (do **not** use another product's database). Copy its **database UUID** into wrangler.json's DB.database_id.
2. Run npm install and npm run check. This installs Wrangler for development tooling only; the deployed Worker has no npm runtime dependencies. (Cloudflare account authorization will be required for deployment.)
3. Apply migrations to that new database with: npx wrangler d1 migrations apply thiepn-control --remote. Do not run this against other databases.
4. In **Cloudflare Zero Trust → Access → Applications**, configure a **self-hosted Access application** protecting **control.thiepn.dev** for your specific email. Use an email OTP policy or an approved identity provider. Copy the **Access application audience (AUD)** and your Cloudflare Access team domain.
5. Set **Worker secrets** using npx wrangler secret put ACCESS_TEAM_DOMAIN, npx wrangler secret put ACCESS_AUD, and npx wrangler secret put OWNER_EMAIL. TEAM_DOMAIN must be like https://your-team.cloudflareaccess.com. OWNER_EMAIL must match the Access identity. **Never commit the actual values.**
6. After Access policy and secrets are in place and have been checked, review the custom hostname control.thiepn.dev, then (only with explicit owner approval) run npx wrangler deploy. Cloudflare custom-domain configuration is **not** in the repository; connect control.thiepn.dev in the Worker dashboard after Access has been configured. Do not expose a public workers.dev route.

**This PR does not perform any Cloudflare create/deploy, DNS, billing or migration operation.** Pricing/free-tier limits are subject to Cloudflare's current policies. For roughly 100 personal projects, Free allowances should suffice.

### Security model

- All API **and static asset** requests traverse the Worker first; Worker verifies the **signed Cloudflare Access JWT** (RSA signature against the team public keys, issuer, audience, expiry and exact approved email). Missing config, missing/invalid token and unauthorized email fail closed.
- Cloudflare Access at the custom hostname must also enforce your private policy; there is **no fallback public endpoint** or development bypass in production.
- Writes require same-origin browser requests and optimistic version checks. Parameterized D1 statements guard SQL input. Exported JSON contains project data; store backups privately.
- No repo titles or percentages are automatically fabricated: imported repos begin with **unassessed progress** and no priority.
- This dashboard is a **personal single-owner app**, not a public multiuser SaaS.

### Development and validation

npm run check — Node API and auth-denial tests, syntax, project operations against a fake D1 interface. npm run build:check — bundles Worker for Cloudflare without deployment. Real Cloudflare Access/D1 and mobile browser acceptance remain **not performed** until the owner authorizes provisioning and deployment.

### Preserved history

The previous Supabase/P0–P5/C1–C6 work remains in its existing branches and draft PRs. This standalone branch begins from main and **does not merge or delete** the earlier work.
