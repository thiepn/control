#!/usr/bin/env bash
# Isolated synthetic runner PostgreSQL only; no service URLs, remote clusters or credential access.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo "P12 requires runner-local postgres OS account" >&2; exit 2; }
for var in PGHOST PGSERVICE DATABASE_URL PGPORT PGUSER; do
 [[ -z "$(printenv "$var" 2>/dev/null || true)" ]] || { echo "External Postgres configuration rejected" >&2; exit 2; }
done
source_db=control_p6_test
restore_db=control_p12_witness
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$source_db'")" == 1 ]] || exit 2
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$restore_db'")" ]] ||
 { echo "Refusing preexisting destination" >&2; exit 2; }
scratch="$(mktemp -d)"
cleanup(){ dropdb --if-exists "$restore_db" >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -d "$source_db" <<'SQL'
CREATE SCHEMA IF NOT EXISTS p12_synthetic;
CREATE TABLE IF NOT EXISTS p12_synthetic.witness (id integer PRIMARY KEY, content text NOT NULL);
INSERT INTO p12_synthetic.witness VALUES (1, 'original_snapshot')
 ON CONFLICT(id) DO UPDATE SET content='original_snapshot';
SQL
pg_dump -Fc --no-owner --no-acl -f "$scratch/archive.dump" "$source_db"
archive_sha="$(sha256sum "$scratch/archive.dump" | awk '{print $1}')"
createdb "$restore_db"
pg_restore --no-owner --no-acl -e -d "$restore_db" "$scratch/archive.dump"
snapshot="$(psql -XAt -d "$restore_db" -c 'SELECT content FROM p12_synthetic.witness WHERE id=1')"
[[ "$snapshot" == original_snapshot ]] || exit 3
psql -X -v ON_ERROR_STOP=1 -d "$restore_db" -c \
 "UPDATE p12_synthetic.witness SET content='interrupted_change' WHERE id=1" >/dev/null
[[ "$(psql -XAt -d "$restore_db" -c 'SELECT content FROM p12_synthetic.witness WHERE id=1')" == interrupted_change ]] || exit 3
dropdb "$restore_db"
createdb "$restore_db"
pg_restore --no-owner --no-acl -e -d "$restore_db" "$scratch/archive.dump"
[[ "$(psql -XAt -d "$restore_db" -c 'SELECT content FROM p12_synthetic.witness WHERE id=1')" == original_snapshot ]] || exit 3
[[ "$(sha256sum "$scratch/archive.dump" | awk '{print $1}')" == "$archive_sha" ]] || exit 3
printf 'corrupted' > "$scratch/corrupt.dump"
if pg_restore --list "$scratch/corrupt.dump" >/dev/null 2>&1; then exit 4; fi
echo "P12 runner-local independent snapshot/damage/recreate/recover/hash witness PASS"
echo "No real Supabase backup, physical witness, human signoff or production restore"
