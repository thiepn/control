# R2 — Full Portfolio Intelligence Evidence Audit
Date: 2026-10-11. Scope: `thiepn/control` private D1 only.

## Snapshot
- GitHub repositories discovered: **87**, up from 86. Newly detected: `thiepn/karaoke`, imported without manual owner work.
- D1 contains **87 projects and 87 review records**, checked against actual database query.
- **20 reviews are metadata-only**, so the remaining 67 have at least a recent PR or accessible README reference.
- All 87 have a category, evidence URL, confidence, recommended next action, and priority tier.
- **0 fabricated numeric completion percentages**: progress remains nullable/unknown for every project.
- `source_checked_at` records the database review write, **not** proof of a live browser/device witness. CI reviews are sampled, not exhaustive.
- A PR title, merged status or passed CI is not evidence of real-world deployment, consent, rights, backup recovery or physical accessibility acceptance.
- `status=active` for an open PR means repository work appears active, **not** the site is operational.

## Evidence classifications
`project_reviews.evidence_depth` values:
- `PR metadata` or `PR + README`: direct GitHub PR evidence, possibly with project documentation.
- `README + metadata`: published README/repository description, but no PR history found in inspection.
- `Repository metadata`: repository existence and absence of fetched PR/accessible README; low-confidence classification.

The UI must **not** represent metadata-only reviews as source-backed completion or recommend them in the main focus queue. A later phase may inspect missing source contents and raise confidence based on real evidence.

## Highest-risk items observed
| Repository | Evidence | Qualification boundary |
| --- | --- | --- |
| MDD | [P76](https://github.com/thiepn/my-daily-devotion/pull/76), [failed certification](https://github.com/thiepn/my-daily-devotion/actions/runs/38085373681) | Do not change locked goldens or declare release |
| LiGoQuiz | [G25 Verify failure](https://github.com/thiepn/ligoquiz/actions/runs/38092011989) | Pilot/source rights still independent |
| StudyOS | [F22 merged](https://github.com/thiepn/studyOS/pull/55), [main CI success](https://github.com/thiepn/studyOS/actions/runs/38089789226) | Do not infer real OAuth/owner-RLS acceptance |
| Hub | [H20 PR](https://github.com/thiepn/thiepn.github.io/pull/115) | Disposable backend and origin acceptance separate |
| PDF | [F17 draft](https://github.com/thiepn/pdf/pull/161) | Original document and human rights gates remain |
| Room | [V18 draft](https://github.com/thiepn/room/pull/25) | Original painterly image identity approval blocked |
| Chess | [P86 draft](https://github.com/thiepn/chess/pull/73) | Skipped deploy CI is not deploy success |
| Finance | [P38 draft](https://github.com/thiepn/finance/pull/33) | Never access protected ledger data |

## Changes delivered
- Populate review records for all 87 GitHub projects with source links, source depth, category, stage, bounded recommendation, confidence, source check timestamp.
- Existing non-null priority selections preserved; new unprioritized projects assigned tentative P1–P3.
- `projects.progress` unchanged and no remote protected app data inspected.
- UI exposes source vs metadata-only filters, source-depth labels and accurate coverage buckets, and excludes metadata-only records from the main Focus queue.
- Only the dedicated Control D1 and Worker are modified; no other production services.

## R3 handoff
Implement genuine individual project briefings, drill-down evidence, real milestones and explicit delivery gates. Prefer source-grounded assertions and accept unknown completion. Avoid adding complicated settings that turn AI triage back into user data entry.
