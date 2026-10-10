# THIEPN Control R3 — Evidence-linked project briefings
Date: 2026-10-11

Each repository has a bookmarkable private `#project/<repo-name>` briefing. Source-backed categories, reported phase, useful recommendation, uncertainty, unknown numeric completion, and original GitHub evidence from R2 are always shown. Qualitative scorecards independently distinguish **implementation, quality/CI, release readiness, and owner acceptance** as Confirmed, In progress, Blocked or Unverified. There is deliberately no numerical completion score.

**Evidence ledger**: `migrations/0004_project_signals.sql`, dedicated D1 `project_signals`, and owner-gated read-only `/api/signals`. Seed contains **50 source-linked records for 18 higher-impact repositories** after selected PR/CI inspections. It is not a complete independent certification of all 87 projects. Repositories with no evidence signals display all readiness dimensions as **Unverified**, never pass-by-default.

Changes are confined to `thiepn/control` main and existing Cloudflare Worker/D1. There are no owner-edit forms, paid AI API calls, service-worker changes, external secrets in browser JS or changes to other THIEPN apps. The bundled production module must embed the exact four `public/` files; tests pin this contract.

**Release gates**: Source merge is not deployed production; passed CI does not prove physical device/rights/owner approval. A newer failing run must not be overwritten with a historical passing run in the same dimension without explanation. User-authenticated browser and physical acceptance remain unwitnessed unless explicitly verified.

**R4**: Explainable focus limit of 3–5 projects; tradeoffs based on real gates, evidence confidence, ongoing active work and actual deadlines. Do not fabricate project completion or automatically change owner priority choices.
