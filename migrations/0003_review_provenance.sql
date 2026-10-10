-- One-time additive D1 migration for R2 review provenance.
-- Existing records and original owner project data remain unchanged.
ALTER TABLE project_reviews ADD COLUMN evidence_depth TEXT;
ALTER TABLE project_reviews ADD COLUMN last_pushed_at TEXT;
ALTER TABLE project_reviews ADD COLUMN source_checked_at TEXT;
