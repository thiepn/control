#!/usr/bin/env bash
# Runner-local synthetic aborted transaction only. No service URI or external accounts.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo "postgres OS user required" >&2; exit 2; }
for var in PGHOST PGSERVICE DATABASE_URL PGPORT PGUSER; do
 [[ -z "$(printenv "$var" 2>/dev/null || true)" ]] || { echo "External database configuration refused" >&2; exit 2; }
done
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='control_p6_test'")" == 1 ]] ||
 { echo "Missing runner-local isolated database" >&2; exit 2; }
psql -X -v ON_ERROR_STOP=1 -d control_p6_test <<'SQL'
CREATE SCHEMA IF NOT EXISTS p13_synthetic;
CREATE TABLE IF NOT EXISTS p13_synthetic.recovery_probe (id int PRIMARY KEY, state text NOT NULL);
INSERT INTO p13_synthetic.recovery_probe VALUES (1,'stable')
 ON CONFLICT (id) DO UPDATE SET state='stable';
BEGIN;
UPDATE p13_synthetic.recovery_probe SET state='interrupted_without_authorization' WHERE id=1;
ROLLBACK;
DO $$
BEGIN
 IF (SELECT state FROM p13_synthetic.recovery_probe WHERE id=1) <> 'stable'
 THEN RAISE EXCEPTION 'P13 interrupted transaction was committed'; END IF;
END
$$;
SQL
scratch="$(mktemp -d)"
cleanup(){ dropdb --if-exists control_p13_restore >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='control_p13_restore'")" ]] ||
 { echo "Refusing existing restore DB" >&2; exit 2; }
pg_dump -Fc -f "$scratch/snapshot" control_p6_test
digest="$(sha256sum "$scratch/snapshot" | awk '{print $1}')"
createdb control_p13_restore
pg_restore --no-owner --no-acl -e -d control_p13_restore "$scratch/snapshot"
[[ "$(psql -XAt -d control_p13_restore -c 'SELECT state FROM p13_synthetic.recovery_probe WHERE id=1')" == stable ]] || exit 3
[[ "$(sha256sum "$scratch/snapshot" | awk '{print $1}')" == "$digest" ]] || exit 3
printf 'tampered' > "$scratch/damaged"
if pg_restore --list "$scratch/damaged" >/dev/null 2>&1; then
 echo "Tampered synthetic dump accepted" >&2;exit 3
fi
echo "P13 runner-local interrupted transaction, stable snapshot and damaged-backup refusal PASS"
echo "No real Supabase backup or human authorization collected"
