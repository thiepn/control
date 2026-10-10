#!/usr/bin/env bash
# CI runner-local synthetic PostgreSQL ONLY; no hosted service connections.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo "P15 requires local postgres OS user" >&2; exit 2; }
for v in PGHOST PGSERVICE DATABASE_URL PGPORT PGUSER; do
 [[ -z "$(printenv "$v" 2>/dev/null || true)" ]] || { echo "Remote database configuration prohibited" >&2; exit 2; }
done
db=control_p6_test
dest=control_p15_recovery
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$db'")" == 1 ]] || exit 2
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$dest'")" ]] ||
 { echo "Refusing preexisting recovery database" >&2;exit 2; }
temp="$(mktemp -d)"
cleanup(){ dropdb --if-exists "$dest" >/dev/null 2>&1 || true; rm -rf "$temp"; }
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -d "$db" <<'SQL'
CREATE SCHEMA IF NOT EXISTS p15_synthetic;
CREATE TABLE IF NOT EXISTS p15_synthetic.rights_custody
 (tenant text PRIMARY KEY, object_sha text NOT NULL, consent_state text NOT NULL);
INSERT INTO p15_synthetic.rights_custody VALUES
 ('owner_a',repeat('a',64),'revoked'),
 ('owner_b',repeat('b',64),'unverified')
 ON CONFLICT (tenant) DO UPDATE SET object_sha=EXCLUDED.object_sha,
 consent_state=EXCLUDED.consent_state;
BEGIN;
UPDATE p15_synthetic.rights_custody SET consent_state='fake_granted' WHERE tenant='owner_a';
ROLLBACK;
DO $$
BEGIN
 IF (SELECT consent_state FROM p15_synthetic.rights_custody WHERE tenant='owner_a') <> 'revoked'
  OR (SELECT consent_state FROM p15_synthetic.rights_custody WHERE tenant='owner_b') <> 'unverified'
 THEN RAISE EXCEPTION 'Revoked consent was resurrected or owner isolation lost';END IF;
END $$;
SQL
pg_dump -Fc -f "$temp/snapshot" "$db"
hash="$(sha256sum "$temp/snapshot"|awk '{print $1}')"
createdb "$dest"
pg_restore --no-owner --no-acl -e -d "$dest" "$temp/snapshot"
state="$(psql -XAt -d "$dest" -c "SELECT consent_state FROM p15_synthetic.rights_custody WHERE tenant='owner_a'")"
[[ "$state" == revoked ]] || exit 3
[[ "$(psql -XAt -d "$dest" -c "SELECT consent_state FROM p15_synthetic.rights_custody WHERE tenant='owner_b'")" == unverified ]] || exit 3
[[ "$(sha256sum "$temp/snapshot"|awk '{print $1}')" == "$hash" ]] || exit 3
printf 'TAMPERED_ARCHIVE' > "$temp/tampered"
if pg_restore --list "$temp/tampered" >/dev/null 2>&1;then echo 'Tampered dump accepted' >&2;exit 3;fi
echo "P15 isolated synthetic revoked-consent preservation, owner rollback, snapshot/restore and corruption rejection PASS"
echo "No actual subject consent or authorized external Supabase restoration established"
