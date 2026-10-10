# THIEPN Control — Command Center Rebuild

**Product direction, 11 October 2026.** Replace the editable GitHub list with a private **AI-managed, read-mostly personal project command center**. The user tells ChatGPT what should change. ChatGPT is responsible for evidence gathering, assessments and updating records, not for assigning the user 86 forms to fill.

## Product contract

1. **Observe, don't administer:** Primary flows are view priority, next best action, blockers, project overview, AI assessment provenance and review history. No per-project editing required from the owner.
2. **Truthful, useful intelligence:** AI can propose priority and next action using evidence from GitHub, recent PRs, tests, owner guidance and linked sources. Distinguish inference from verification, mark uncertainty and leave numeric completion unknown unless defensible.
3. **Multiple destinations:** Overview, Focus, Portfolio (with categories), Intelligence and Activity. Mobile has usable navigation and doesn't bury the core recommendation.
4. **ChatGPT is the editor:** Changes flow via connected GitHub/Cloudflare. Do not add paid LLM calls or client-side AI keys; a ChatGPT scheduled review may update Cloudflare D1 via the connected tools.
5. **Automation with accountability:** Store source links, review time and confidence; allow AI refresh on demand and on an agreed cadence. Never silently rewrite owner-set decisions.
6. **Low maintenance:** No local tools, terminal, Docker, second Supabase or manual Cloudflare setup. Code in GitHub main; deploy in the same phase through Cloudflare, verify CI and runtime.
7. **Protect other systems:** Scope all writes to thiepn/control, the dedicated Control D1, its Worker and Access app. Do not touch Account/Core or other websites.
8. **Fast product iteration:** Visible improvements before abstract governance, with regression tests, security checks and honest acceptance evidence.

## Rebuild phases

| Phase | Outcome | Acceptance |
|---|---|---|
| R0 — Reset and product contract | Audit the mistaken MVP, lock the AI-led direction and owner workflow | This document and precise backlog in main |
| R1 — Decision-first command center | Replace static list with polished navigation, Focus, Portfolio, Intelligence, Activity; add evidenced review records for active projects | Live responsive dashboard, review coverage, no manual data-entry requirement |
| R2 — Full portfolio intelligence | Inspect and classify all 86 GitHub repositories, use evidence-driven active/archived/project families; mark unknowns | Coverage expanded, citations and confidence per reviewed repo |
| R3 — Project briefings & scorecards | Project detail views: current phase, milestones, real blockers, delivery gaps, confidence, suggestions | Implemented source-linked private scorecards; see docs/R3_PROJECT_BRIEFINGS.md |
| R4 — Smart prioritization | Curated five-project budget, current blockers, evidenced prerequisites, deadline uncertainty and urgency lanes | Implemented qualitative focus; see docs/R4_SMART_FOCUS.md |
| R5 — AI refresh engine | Schedule recurring ChatGPT-connected review using existing GitHub + Cloudflare tools, plus on-demand review by chat | Writes are conflict-aware, idempotent, visible and testable |
| R6 — Change history & reliability | Evidence snapshots, stale review alerts, errors, source freshness and non-destructive correction | Owner sees what changed and why |
| R7 — Dashboard experience | Keyboard access, small-screen real-device checks, refined tables, search, quick navigation and useful visualizations | Clearly legible, responsive, accessible, no generic template feel |
| R8 — ChatGPT command workflows | Explicit conversation instructions for review, rescope, category, archive, priority change, and one-project update | Owner never needs to edit records manually |
| R9 — Continuous quality & deployment | Self-contained build generation, tested production deployments, protected GitHub main integration, rollback procedure | No manual build/deploy intervention, verified domain and sign-in |
| R10 — Product acceptance | Genuine owner evaluation, repair demonstrated issues, release as ongoing personal tool | Owner confirms usable dashboard and trustworthy assessments |

## Immediate evidence boundary

R2 has triaged all 87 visible GitHub repositories, including newly discovered `karaoke`; 20 records are explicitly metadata-only. All evidence URLs are preserved, but source-backed triage does not amount to a release audit. See `docs/R2_EVIDENCE_AUDIT.md`. Numeric progress percentages remain unknown until verified milestones support them.

## Phase execution protocol

Before editing main, inspect current head and existing Worker, Access and D1 bindings. Add focused tests, qualify exact head, deploy the approved main source to Worker `thiepn-control`, verify DNS/Access/D1, and report only real checks. Preserve the owner-only identity boundary. Subsequent phases deliver usable UI or intelligence and do not require further setup screens.
