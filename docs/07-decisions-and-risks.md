# Architecture decisions and explicit blockers

## ADR-001 — Projects are not repositories

Decided: model `projects`, `github_repositories` and `project_repository_links` separately. One project may have zero or many repositories; each repository linked at most once to a project per owner for P0. Rationale: coursework umbrella, French variants, separate owners.

## ADR-002 — Focus and priority orthogonal

Decided: focus max 3, separate from P0–P3 strategic priority. Rationale: high priority may be waiting on external checks; priority is not a scheduling commitment.

## ADR-003 — Unknown is null

Decided: unreviewed progress, deadline, lifecycle and priority are not inferred. Rationale: commits, past conversations and vague phase numbering cannot verify actual completion.

## ADR-004 — Evidence does not grant release authority

Decided: separate percent, exact-head automated gate and human release gate; no auto merge/deploy. Rationale: draft PR green is not a release.

## ADR-005 — Private by default

Decided: local private inventory excluded from VCS; private target repo recommended. Browser has read-only RLS privileges, mutations server-only with ownership checks. Rationale: source metadata includes private repositories and strategic personal plans.

## ADR-006 — AI proposes, human decides

Decided: proposals are staged changes with evidence/provenance and explicit approve/reject; no direct AI write access. Rationale: prevent hallucinated or surprising reclassification and calendar commitments.

## ADR-007 — P0 prototype stays dependency-free

Decided: keep P0 locally testable with Node 22 and static HTML rather than installing unverified/current framework packages offline. P1 scaffolds actual production app after package/security qualification.

## ADR-008 — GitHub archived != portfolio archive

Decided: source `archived` boolean remains raw metadata and cannot set portfolio `archived` status. Even repo names judged experimental require owner review.

## Open blockers

1. `thiepn/control` did not exist as of audit. GitHub connected tool lacks repository creation. **No GitHub commits or draft PR can exist for P0 until repository is created.**
2. No Supabase project specifically designated for THIEPN Control. Schema is unapplied; SQL compile and RLS security tests require live disposable database qualification.
3. DNS, GitHub App installation, deployment identity and OAuth for `projects.thiepn.dev` are not configured. Nothing deployed.
4. Only repository list metadata audited, not contents/complete PR + Actions matrices across all 86 repos. Per-project actual completion/current head/real blockers remain unknown.
5. AI key/ChatGPT custom connector write support not established. No promises of autonomous ChatGPT mutation.

## Risk register

- **Fake progress** → unknown null and target-scoped weighted evidence model; never count commits.
- **Too many active projects** → unreviewed candidates are inbox, strict focus slots, no automatic promotion to active.
- **Private repo leak** → gitignored private inventory, owner RLS, redaction and secret separation.
- **Stacked PR confusion** → exact branch head SHA, required checks and dependency graph.
- **Stale info** → source timestamp, reconcile-at and stale badges.
- **AI scope creep** → model input minimization, token budgets, human approval of semantic edits.
- **UI complexity** → default focus-first dashboard, compact table, only one working next action above fold.
