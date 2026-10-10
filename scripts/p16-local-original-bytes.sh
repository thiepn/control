#!/usr/bin/env bash
# CI-only synthetic PostgreSQL original-byte snapshot. Never real remote Supabase.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo "P16 requires local PostgreSQL system account" >&2; exit 2; }
for k in PGHOST PGSERVICE DATABASE_URL PGPORT PGUSER;do
 [[ -z "$(printenv "$k" 2>/dev/null || true)" ]] || { echo "Remote database environment prohibited" >&2; exit 2; }
done
src=control_p6_test
dest=control_p16_snapshot
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$src'")" == 1 ]] ||
 { echo "Seeded local disposable PostgreSQL required" >&2; exit 2; }
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$dest'")" ]] ||
 { echo "Refusing existing restore target" >&2; exit 2; }
scratch="$(mktemp -d)"
cleanup(){ dropdb --if-exists "$dest" >/dev/null 2>&1 || true; rm -rf "$scratch"; }
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -d "$src" <<'SQL'
CREATE SCHEMA IF NOT EXISTS p16_synthetic;
CREATE TABLE IF NOT EXISTS p16_synthetic.quarantine
 (tenant text PRIMARY KEY, original_content text NOT NULL, consent_state text NOT NULL);
INSERT INTO p16_synthetic.quarantine VALUES
 ('owner_a','first_party_original_a','withdrawn'),
 ('owner_b','first_party_original_b','not_collected')
 ON CONFLICT(tenant) DO UPDATE SET
 original_content=EXCLUDED.original_content, consent_state=EXCLUDED.consent_state;
BEGIN;
UPDATE p16_synthetic.quarantine SET original_content='forged_replacement',
 consent_state='false_regrant' WHERE tenant='owner_a';
ROLLBACK;
DO $$
BEGIN
 IF (SELECT original_content FROM p16_synthetic.quarantine WHERE tenant='owner_a')<>'first_party_original_a'
  OR (SELECT consent_state FROM p16_synthetic.quarantine WHERE tenant='owner_a')<>'withdrawn'
  OR (SELECT consent_state FROM p16_synthetic.quarantine WHERE tenant='owner_b')<>'not_collected'
 THEN RAISE EXCEPTION 'Rollback failed consent withdrawal or ownership isolation'; END IF;
END $$;
SQL
psql -XAt -d "$src" -c "SELECT tenant,original_content,consent_state FROM p16_synthetic.quarantine ORDER BY tenant" > "$scratch/prior-stable"
stable_sha="$(sha256sum "$scratch/prior-stable" | cut -d' ' -f1)"
pg_dump -Fc -f "$scratch/archive.dump" "$src"
archive_sha="$(sha256sum "$scratch/archive.dump"|cut -d' ' -f1)"
createdb "$dest"
pg_restore --no-owner --no-acl -e -d "$dest" "$scratch/archive.dump"
psql -XAt -d "$dest" -c "SELECT tenant,original_content,consent_state FROM p16_synthetic.quarantine ORDER BY tenant" > "$scratch/restored"
[[ "$(sha256sum "$scratch/restored"|cut -d' ' -f1)" == "$stable_sha" ]] || { echo "Original bytes differ after restore" >&2;exit 3; }
[[ "$(sha256sum "$scratch/archive.dump"|cut -d' ' -f1)" == "$archive_sha" ]] || exit 3
[[ "$(psql -XAt -d "$dest" -c "SELECT consent_state FROM p16_synthetic.quarantine WHERE tenant='owner_a'")" == withdrawn ]] || exit 3
printf 'CORRUPTED_P16_ARCHIVE' > "$scratch/corrupt.dump"
if pg_restore --list "$scratch/corrupt.dump" >/dev/null 2>&1;then
 echo "Damaged backup erroneously trusted" >&2;exit 3
fi
echo "P16 runner-local restored original-row bytes verified, withdrawn consent isolated, forged mutation rolled back and damaged archive refused: PASS"
echo "No genuine human consent, physical witness or authorized real Supabase operation was performed"
