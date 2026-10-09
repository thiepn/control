# Product brief and user journeys — P0 locked draft

## Mission and non-goals

Build a **private focus control center** that makes choosing and finishing more work easier than starting more work. It spans multiple GitHub owners, non-GitHub work, repositories with multiple roles, and multi-phase releases.

Distinct from Jira/Linear clones: no team collaboration, billing, social feed, generic AI assistant chat panel, activity-as-productivity score, endless backlog groomer, or mandatory estimates.

## Personas and controls

Initial single-user owner, with strong owner isolation for future migration. Owner chooses priorities and deadlines, and must approve any semantic AI update. GitHub may supply immutable factual events but never autonomously make human release decisions. Mobile and desktop are full first-class access paths.

## Top jobs to be done

1. **Select work**: Open Command, see one primary action, at most three weekly focus commitments, next work-ready steps. If no trustworthy focus plan, show `Choose focus`, not invented ranking.
2. **Find a project**: Search by product, repo, phase or goal across 86+ repositories. Show next action and evidence recency; never conflate GitHub archival with lifecycle.
3. **Resolve bottleneck**: Filter CI failures, stale external approvals, missing evidence; click direct verifiable source; distinguish blocked from waiting.
4. **Understand completion**: Read target definition, weighted milestones, verified vs manually asserted completion, separate release readiness.
5. **Reorder quickly**: Pin, drag/drop or keyboard-shift manual ranking; sort/filter without silently changing manual rank. Bulk move to paused, never bulk fabricate percentages.
6. **Review changes**: Compare suggested before/after fields and linked source evidence; approve/reject atomically, preserve history and rollback.
7. **Handle new work**: New repo creates an unreviewed candidate; does not consume focus slot or enter `active` automatically.
8. **Close work**: Only record `released/completed` with known target, verified release artifact and required human acceptance.

## Information architecture

```
Command      weekly focus / next steps / blockers / review inbox
Portfolio    searchable, sortable table / saved views / manual ordering / batch review
Project      Overview | Targets | Phases | Evidence | History | Links
Review       suggested changes with evidence / acceptance / rejection / undo
Plan         weekly focus slots / user capacity / timeline / optional calendar
Settings     data sources / security / categories / import-export / AI configuration
```

Portfolio default is all **portfolio project records**, not all repositories: repo identity is a linked resource. Imported repository candidates live in an intake queue until accepted/grouped/dismissed.

## Important terms

- `portfolio project`: an outcome-oriented record, possibly linked to 0..N repositories.
- `repository`: factual GitHub source, NOT a project lifecycle state.
- `current target`: version/release goal defining the denominator of completion.
- `phase`: development working unit, not a release or verified milestone by itself.
- `evidence`: observed event with source link, SHA where relevant, and provenance.
- `focus`: explicitly selected weekly commitment; maximum 3.
- `priority`: ordered importance P0–P3 or unassessed; not equivalent to focus.

## Success measures (product validation, not current facts)

- Owner finds any named project in <=3 interactions from Command.
- Owner can create/reorder/change project state from Portfolio without navigating multiple pages.
- Every displayed % identifies target and evidence confidence; no target = `Unassessed`.
- More than 85 repository records load and filter responsively.
- A GitHub merge alone cannot mark release readiness `qualified/released`.
- Weekly focus count never exceeds 3, including concurrent server writes.
