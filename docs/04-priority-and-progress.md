# Priority, focus, progress and release readiness

## Principle: multiple independently meaningful dimensions

`lifecycle`: inbox, planned, active, waiting, paused, completed, archived.
`priority`: P0 critical, P1 high, P2 normal, P3 low, or null until owner assessment.
`weekly focus`: at most 3 explicitly chosen projects with individual completion objectives.
`github_archived`: source repository archival state, unrelated to lifecycle.
`completion`: *target-scoped percentage*, null until target and milestone weights exist.
`release_readiness`: not assessed, blocked, awaiting verification, awaiting human approval, qualified, released.

## Milestone model

A project has zero or more immutable-revision targets. Exactly one current target allowed. Current target must define a detailed, owner-approved `definition_of_done`. Weighted milestones each have a positive weight, completion fraction in [0,1] or null, evidence grade, source, and optionally a required release gate.

`completion = 100 * Σ(weight * fraction) / Σ(weight)` **only if** current target exists, every weight and completion is assessed and denominator >0. Otherwise display `Unassessed` or an explicitly labeled partial coverage value; never default null to zero. Clamp computed display to [0,100], round to integer on display only, retain fractions internally. Full completion of release-gated milestones requires true gate evidence; changing a target creates a new revision and historical percentages remain tied to old target IDs.

Do not treat number of commits, opened PRs, passed unrelated CI jobs, time elapsed, number of chat turns, or a claimed phase number as completion metrics. One passing CI job does not qualify a PR if mandatory jobs remain pending/failed; compare checks with **exact head SHA** and known required check set.

## Release gates

Automated verification = all required checks green at the exact head. Human acceptance = explicit verifiable human record. Production release = deployed artifact and verified production commit. The system cannot infer human approval from success text or GitHub branch naming. Required gates block qualified/released states, regardless of computed percent.

## Ranking: a *proposal*, not an absolute algorithm

Use 5 dimensions with user-approved scales 0..5: strategic value 30%, genuine deadline urgency 25%, closability 20%, unblockability 15%, switching/effort efficiency 10%. Show each component and explanation. Unknown factors remain unrated, not zero. Compute a score only with sufficient ratings; otherwise `Needs review`. Real hard deadlines can trigger separate attention notices, not silent fake urgency. AI may propose priority changes but never mutate manual ordering or deadlines without explicit acceptance.

The primary focus policy is 1 long-term value stream + 1 secondary + 1 closure opportunity. Strict cap at three weekly slots, enforced in DB using slot unique constraint and server transaction. Only owner can assign focus, with AI proposing replacement. Waiting projects remain visible but do not automatically occupy a focus slot.

## Update and conflict semantics

User-owned fields: category, description, priority, deadlines, manual rank, focus, lifecycle, target definitions. AI must not overwrite silently. Evidence-derived fields: GitHub event, exact PR SHA, checks, deployments. Sources may correct their own event status, but the event ledger remains append-only with deduplication and correction history. Any stale/missing evidence lowers confidence without rewriting last human decision.
