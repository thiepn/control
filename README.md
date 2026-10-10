# THIEPN Control — owner-only Cloudflare dashboard

**Live owner-only AI-managed command center.** No Supabase, Docker, local server or custom authentication.

## Live deployment

One self-contained module (`src/production.js`) serves the static dashboard and API after verifying Cloudflare Access. It embeds `public/index.html`, `public/styles.css` and `public/app.js`; the source files remain separately editable. The standalone module is required for Cloudflare API deployment from the connected account (no local CLI).

Production config: `wrangler.json`, Worker `thiepn-control`, D1 binding `DB` to dedicated `thiepn-control` database, `workers_dev:false`, no public preview URLs.

The owner-only Cloudflare Access application protects `control.thiepn.dev` and Worker independently verifies the JWT's RSA signature, issuer, audience, expiration and exact approved email. Cloudflare runtime secrets: `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `OWNER_EMAIL`. Never commit values.

## Features

Overview, Focus, Portfolio, Intelligence and Activity views. Private evidence-backed AI reviews with per-project source links; 86 GitHub projects imported. Progress is not inferred from commits. Existing private CRUD endpoints remain available to ChatGPT-managed updates but manual editing is not the user workflow. See `docs/COMMAND_CENTER_REBUILD.md` for the multi-phase product direction.

## Maintenance

All development is in GitHub; `npm run check` runs source and API contract tests and `npm run build:check` verifies Wrangler packaging without deploying. The production module includes copies of three `public/` assets. If editing them, regenerate its embedded strings before republishing. Do not expose a `workers.dev` or unprotected preview URL.

Previous Supabase phase work remains intact in old draft branches and PRs.
