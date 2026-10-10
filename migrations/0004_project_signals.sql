-- Dedicated Control R3 evidence ledger; additive and idempotent.
CREATE TABLE IF NOT EXISTS project_signals (
  repo_url TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('milestone','gate')),
  dimension TEXT NOT NULL CHECK(dimension IN ('implementation','validation','release','owner')),
  state TEXT NOT NULL CHECK(state IN ('confirmed','in_progress','blocked','unverified')),
  label TEXT NOT NULL, detail TEXT NOT NULL, evidence_url TEXT NOT NULL,
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(repo_url,signal_key),
  FOREIGN KEY(repo_url) REFERENCES project_reviews(repo_url)
);
