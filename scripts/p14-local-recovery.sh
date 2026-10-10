#!/usr/bin/env bash
# P14 disposable PostgreSQL ONLY. Confirm tenant-local rollback and restore; never remote or production.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo "P14 requires runner-local postgres OS user" >&2; exit 2; }
for var in PGHOST PGSERVICE DATABASE_URL PGPORT PGUSER; do
 [[ -z "$(printenv "$var" 2>/dev/null || true)" ]] || { echo "External database setting denied" >&2; exit 2; }
done
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='control_p6_test'")" == 1 ]] ||
 { echo "Synthetic seeded DB required" >&2; exit 2; }
dest=control_p14_restore
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$dest'")" ]] || exit 3
dir="$(mktemp -d)"
cleanup(){ dropdb --if-exists "$dest" >/dev/null 2>&1 || true; rm -rf "$dir"; }
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -d control_p6_test <<'SQL'
CREATE SCHEMA IF NOT EXISTS p14_synthetic;
CREATE TABLE IF NOT EXISTS p14_synthetic.owner_recovery (
 tenant text PRIMARY KEY, evidence_state text NOT NULL);
INSERT INTO p14_synthetic.owner_recovery VALUES ('owner_a','original_a'),('owner_b','original_b')
 ON CONFLICT (tenant) DO UPDATE SET evidence_state=EXCLUDED.evidence_state;
BEGIN;
UPDATE p14_synthetic.owner_recovery SET evidence_state='denied_production_cutover' WHERE tenant='owner_a';
ROLLBACK;
DO $$
BEGIN
 IF (SELECT evidence_state FROM p14_synthetic.owner_recovery WHERE tenant='owner_a') <> 'original_a'
  OR (SELECT evidence_state FROM p14_synthetic.owner_recovery WHERE tenant='owner_b') <> 'original_b'
 THEN RAISE EXCEPTION 'P14 tenant rollback lost isolation'; END IF;
END $$;
SQL
pg_dump -Fc -f "$dir/disposable.dump" control_p6_test
original="$(sha256sum "$dir/disposable.dump" | awk '{print $1}')"
createdb "$dest"
pg_restore --no-owner --no-acl -e -d "$dest" "$dir/disposable.dump"
[[ "$(psql -XAt -d "$dest" -c "SELECT evidence_state FROM p14_synthetic.owner_recovery WHERE tenant='owner_a'")" == original_a ]] || exit 4
[[ "$(psql -XAt -d "$dest" -c "SELECT evidence_state FROM p14_synthetic.owner_recovery WHERE tenant='owner_b'")" == original_b ]] || exit 4
[[ "$(sha256sum "$dir/disposable.dump" | awk '{print $1}')" == "$original" ]] || exit 4
printf 'damaged' > "$dir/invalid"
if pg_restore --list "$dir/invalid" >/dev/null 2>&1; then exit 5; fi
echo "P14 runner-local two-tenant rollback, immutable snapshot, restore and corrupted archive rejection: PASS"
echo "No real Supabase or independently witnessed physical recovery was performed"
