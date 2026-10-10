# R4 — Bounded source-led focus and prioritization
Date: 11 October 2026.

## What ships
- A *curated shortlist of five* projects rather than the former broad P0–P3 project list. The read-only Focus view groups them into **Act now**, **Prepare/verify**, and **Await external evidence**, with linkable evidence, rationale, specific action, release constraints, and verified prerequisites.
- The Overview's main recommendation and Focus preview now follow the curated order instead of the alphabetical first P0 project.
- New protected read-only `GET /api/focus`; records live in additive dedicated D1 `focus_recommendations` (5 maximum). Existing `projects.priority` values and progress are **not changed**. The separate shortlist rank does not override the owner's P0–P3 decision.
- Each recommendation may have a `deadline_date` **only with an independently sourced `deadline_evidence_url`**. All five initial deadlines are null; the UI explicitly states 'No verified deadline'. No fictional urgency or project timeline.
- One verified PR dependency: Library Account race fix PR #163 is stacked on preference-preservation PR #162. External gates for Hub disposable owner-RLS test and LiGoQuiz original question/media rights and game-night pilot remain unapproved and clearly separated from engineering CI.
- The source-bounded selection reflects real GitHub PRs, selected exact-head CI, current blockers and risk to real data; it is an AI-managed editorial decision, **not** a universally accurate numerical priority/effort algorithm.
- Not all 87 repository reviews were independently retested. The 87-project portfolio and the R3 briefings remain accessible.
- R4 also updates the stale LiGoQuiz R2/R3 signals: G25's older failure was superseded by G26 success runs [Verify](https://github.com/thiepn/ligoquiz/actions/runs/38093041249) and [G4](https://github.com/thiepn/ligoquiz/actions/runs/38093041240), while original rights/venue/owner release is still NO-GO.

## Curated order and evidence
1. **MDD — Act now:** failing candidate [Release Certification](https://github.com/thiepn/my-daily-devotion/actions/runs/38085373681); release and real-device approval remain separately blocked.
2. **Library — Act now:** [PR #163](https://github.com/thiepn/library/pull/163) identity race guard depends on [PR #162](https://github.com/thiepn/library/pull/162); check first-sync data durability.
3. **StudyOS — Prepare:** [main CI success](https://github.com/thiepn/studyOS/actions/runs/38093672155) and merged F22 are source evidence, not real owner RLS/mobile sign-off.
4. **Hub — Prepare:** [H20 PR](https://github.com/thiepn/thiepn.github.io/pull/115) source qualified; independent disposable PostgreSQL/owner-RLS acceptance awaits authorized resources and consent.
5. **LiGoQuiz — Wait:** [G26 PR](https://github.com/thiepn/ligoquiz/pull/24) and latest tests passed; actual rights and physical pilot are not approved.

## Safety and R5 readiness
No paid model calls, owner-side project editing, domain/DNS changes, unrelated repository deployments, or protected Core/Account data usage. The shortlist is stored in a dedicated database table so an R5 recurring reviewer can update it with real changes using transactional and freshness/concurrency checks, history and idempotent source receipts. A scheduled ChatGPT task does not itself guarantee D1 updates; R5 must verify every update and handle errors honestly.

For each subsequent focus revision, require exact recent source evidence, priority preservation, an explanation of why something enters/exits the five-item budget, and no invented estimates. External gates remain externally gated.
