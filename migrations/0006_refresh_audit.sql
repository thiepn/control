-- R5 additive refresh evidence and per-row optimistic concurrency. Run on dedicated Control D1 only.
ALTER TABLE project_reviews ADD COLUMN refresh_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE project_reviews ADD COLUMN refresh_run_id TEXT;
ALTER TABLE focus_recommendations ADD COLUMN refresh_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE focus_recommendations ADD COLUMN refresh_run_id TEXT;
CREATE TABLE IF NOT EXISTS refresh_runs (
 run_id TEXT PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('supervised','scheduled')),
 status TEXT NOT NULL CHECK(status IN ('running','succeeded','partial','failed')),
 started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, finished_at TEXT,
 checked_count INTEGER NOT NULL DEFAULT 0, changed_count INTEGER NOT NULL DEFAULT 0,
 discovered_count INTEGER NOT NULL DEFAULT 0, focus_changed_count INTEGER NOT NULL DEFAULT 0,
 error_note TEXT, evidence_note TEXT
);
CREATE TABLE IF NOT EXISTS source_observations (
 repo_url TEXT PRIMARY KEY REFERENCES projects(repo_url), fingerprint TEXT NOT NULL, source_url TEXT NOT NULL,
 default_branch TEXT, main_sha TEXT, latest_pr_number INTEGER, latest_pr_head TEXT, latest_ci_id INTEGER,
 latest_ci_conclusion TEXT, last_pushed_at TEXT, last_checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0), refresh_run_id TEXT REFERENCES refresh_runs(run_id)
);
CREATE TABLE IF NOT EXISTS refresh_events (
 event_id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT,
 entity_type TEXT NOT NULL CHECK(entity_type IN ('source','review','focus','discovery')),
 repo_url TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('insert','update')),
 evidence_url TEXT, previous_revision INTEGER, next_revision INTEGER,
 before_fingerprint TEXT, after_fingerprint TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER IF NOT EXISTS refresh_event_observation_insert AFTER INSERT ON source_observations
BEGIN INSERT INTO refresh_events (run_id,entity_type,repo_url,action,evidence_url,next_revision,after_fingerprint)
VALUES (NEW.refresh_run_id,'source',NEW.repo_url,'insert',NEW.source_url,NEW.revision,NEW.fingerprint); END;
CREATE TRIGGER IF NOT EXISTS refresh_event_observation_change AFTER UPDATE OF fingerprint ON source_observations WHEN OLD.fingerprint IS NOT NEW.fingerprint
BEGIN INSERT INTO refresh_events (run_id,entity_type,repo_url,action,evidence_url,previous_revision,next_revision,before_fingerprint,after_fingerprint)
VALUES (NEW.refresh_run_id,'source',NEW.repo_url,'update',NEW.source_url,OLD.revision,NEW.revision,OLD.fingerprint,NEW.fingerprint); END;
CREATE TRIGGER IF NOT EXISTS refresh_event_review_change AFTER UPDATE OF refresh_version ON project_reviews WHEN NEW.refresh_version>OLD.refresh_version
BEGIN INSERT INTO refresh_events (run_id,entity_type,repo_url,action,evidence_url,previous_revision,next_revision)
VALUES (NEW.refresh_run_id,'review',NEW.repo_url,'update',NEW.evidence_url,OLD.refresh_version,NEW.refresh_version); END;
CREATE TRIGGER IF NOT EXISTS refresh_event_focus_change AFTER UPDATE OF refresh_version ON focus_recommendations WHEN NEW.refresh_version>OLD.refresh_version
BEGIN INSERT INTO refresh_events (run_id,entity_type,repo_url,action,evidence_url,previous_revision,next_revision)
VALUES (NEW.refresh_run_id,'focus',NEW.repo_url,'update',NEW.evidence_url,OLD.refresh_version,NEW.refresh_version); END;
CREATE TRIGGER IF NOT EXISTS refresh_event_project_discovery AFTER INSERT ON projects WHEN NEW.repo_url IS NOT NULL
BEGIN INSERT INTO refresh_events (run_id,entity_type,repo_url,action,evidence_url,next_revision)
VALUES (NULL,'discovery',NEW.repo_url,'insert',NEW.repo_url,NEW.version); END;
