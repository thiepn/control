# Repository inventory audit — 2026-10-09

## Evidence boundary

Verified through connected GitHub repository enumeration, owner `thiepn`: **85** accessible repositories; owner `newmedu`: **1** (one accessible private repository). Total **86**. `thiepn/control` returned GitHub 404. All 86 had `archived=false` in the returned metadata. Visibility: 82 public + 4 private across both owners (3 private thiepn, 1 newmedu). Count reflects connected and accessible repos, not necessarily the entirety of all work ever created.

Snapshot is stored at `data/private/repository_inventory.json` and review worksheet at `data/private/review_queue.csv`. Both are gitignored to avoid leaking private repository identities. To get the exact 86 rows, use those files; public documentation intentionally does not duplicate the private names.

## Proposed classifications (NOT verified portfolio states)

| Proposal | Count | Meaning |
|---|---:|---|
| Product candidate | 37 | Possibly a standalone app, site, or creative product |
| Coursework/learning candidate | 16 | Likely university exercise or study-material repository |
| Experimental candidate | 18 | Name suggests prototype, game experiment, or standalone trial |
| Infrastructure/support candidate | 15 | Utility, workspace, account/service or supporting library |
| **Total** | **86** | **Requires human review** |

Classifications use repository names plus prior user-described project context. **We did not inspect every README, branch, PR, CI, release or deployment**, so classifications are preliminary. A suggested `experiment` is never automatically archived or deleted; a learning repo can remain an active portfolio project if its owner so decides.

`previously_discussed_development=true` indicates a repository was mentioned in a prior development discussion; it does not prove present activity. No snapshot record claims `active` lifecycle, a completion value, a phase SHA, a deadline, or a priority. In the dashboard all these fields initially render `Unassessed`, except factual GitHub metadata.

## Candidate grouping proposals requiring confirmation

- Nine numbered coursework exercises may become one umbrella project with nine linked repositories.
- Three design demonstration repositories may become one parent project or remain individual prototypes.
- Multiple French learning repositories may belong to one product/workstream or remain separate initiatives.
- Platform support repositories may be grouped into an infrastructure category without erasing independently releasable products.

Avoid importing one project per repository until owner confirms groups. Candidate import should preserve all repository identities with a review action: `Create project`, `Link to project`, `Ignore for now`, or `Mark non-project`.

## Next audit evidence needed

At P3, read access-limited PRs, latest commit timestamps and exact-head CI for candidate projects, including project branches with stacked draft PRs. For private repositories, import only using account-authorized grants. No source state should be inferred from conversations alone. On repo permissions/revocation failure, retain last verified snapshot with `stale` indication, not fabricated fresh status.
