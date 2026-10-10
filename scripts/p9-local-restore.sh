#!/usr/bin/env bash
# Isolated CI runner postgres only, never a remote or production DB.
set -euo pipefail
[[ "$(id -un)" == "postgres" ]] || { echo "Local postgres user required" >&2; exit 2; }
src="control_p6_test"
dest="control_p9_restore"
for setting in PGHOST PGSERVICE DATABASE_URL; do
  [[ -z "$(printenv "$setting" 2>/dev/null || true)" ]] || { echo "Remote DB configuration denied" >&2; exit 2; }
done
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$src'")" == "1" ]] ||
 { echo "Missing isolated seeded database" >&2; exit 2; }
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$dest'")" ]] ||
 { echo "Restore database already exists: refusing destructive action" >&2; exit 2; }
scratch="$(mktemp -d)"
cleanup(){ dropdb --if-exists "$dest" >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -d "$src" <<'SQL'
CREATE SCHEMA IF NOT EXISTS p9_synthetic;
CREATE TABLE IF NOT EXISTS p9_synthetic.rollback_probe (id integer PRIMARY KEY, state text NOT NULL);
INSERT INTO p9_synthetic.rollback_probe(id,state) VALUES (1,'before')
  ON CONFLICT(id) DO UPDATE SET state='before';
SQL
pg_dump -Fc --no-owner --no-acl -f "$scratch/snapshot.dump" "$src"
sha256sum "$scratch/snapshot.dump" | awk '{print $1}' > "$scratch/backup.sha256"
createdb "$dest"
pg_restore --no-owner --no-acl -e -d "$dest" "$scratch/snapshot.dump"
before="$(psql -XAt -d "$src" -c 'SELECT state FROM p9_synthetic.rollback_probe WHERE id=1')"
after="$(psql -XAt -d "$dest" -c 'SELECT state FROM p9_synthetic.rollback_probe WHERE id=1')"
[[ "$before" == "before" && "$after" == "$before" ]] || exit 3
psql -X -v ON_ERROR_STOP=1 -d "$dest" -c "UPDATE p9_synthetic.rollback_probe SET state='changed' WHERE id=1"
[[ "$(psql -XAt -d "$dest" -c 'SELECT state FROM p9_synthetic.rollback_probe WHERE id=1')" == "changed" ]] || exit 3
dropdb "$dest"
createdb "$dest"
pg_restore --no-owner --no-acl -e -d "$dest" "$scratch/snapshot.dump"
[[ "$(sha256sum "$scratch/snapshot.dump" | awk '{print $1}')" == "$(cat "$scratch/backup.sha256")" ]] || exit 3
[[ "$(psql -XAt -d "$dest" -c 'SELECT state FROM p9_synthetic.rollback_probe WHERE id=1')" == "before" ]] || exit 3
echo "P9 runner-local synthetic PostgreSQL full backup, mutation, recreate and verified restore: PASS"
echo "No actual Supabase backup or production rollback has been performed"
