-- R4 owner-preserving, additive qualitative focus decisions.
-- No project priorities or progress values are modified by this table.
CREATE TABLE IF NOT EXISTS focus_recommendations (
  rank INTEGER PRIMARY KEY CHECK(rank BETWEEN 1 AND 5),
  repo_url TEXT NOT NULL UNIQUE REFERENCES projects(repo_url),
  lane TEXT NOT NULL CHECK(lane IN ('act_now','prepare','waiting')),
  headline TEXT NOT NULL,
  rationale TEXT NOT NULL,
  next_action TEXT NOT NULL,
  constraint_note TEXT NOT NULL,
  dependency_url TEXT,
  dependency_note TEXT,
  deadline_date TEXT,
  deadline_evidence_url TEXT,
  evidence_url TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK(confidence IN ('low','medium','high')),
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
