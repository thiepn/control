CREATE TABLE IF NOT EXISTS project_reviews (
  repo_url TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  stage TEXT,
  summary TEXT NOT NULL,
  blocker TEXT,
  recommendation TEXT NOT NULL,
  evidence_url TEXT,
  confidence TEXT NOT NULL DEFAULT 'medium' CHECK(confidence IN ('low','medium','high')),
  assessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);