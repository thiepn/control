-- Apply only to a NEW dedicated Cloudflare D1 database for THIEPN Control.
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 100),
  priority TEXT CHECK(priority IN ('P0','P1','P2','P3')),
  progress INTEGER CHECK(progress BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','paused','completed')),
  next_action TEXT,
  repo_url TEXT UNIQUE,
  notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS projects_status ON projects(status);
