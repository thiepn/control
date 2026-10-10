#!/usr/bin/env bash
# LOCAL PostgreSQL synthetic proof only. No external Supabase hosts, credentials or protected data.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo 'Local postgres OS user required' >&2; exit 2; }
for k in PGHOST PGPORT PGUSER PGSERVICE DATABASE_URL; do
 [[ -z "$(printenv "$k" 2>/dev/null || true)" ]] || { echo 'Remote DB config rejected' >&2; exit 2; }
done
src=control_p6_test
dest=control_p17_replay
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$src'")" == 1 ]] || exit 2
[[ -z "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='$dest'")" ]] || { echo 'Restore DB already exists: refuse' >&2;exit 3; }
tmp="$(mktemp -d)"
cleanup(){ dropdb --if-exists "$dest" >/dev/null 2>&1||true; rm -rf "$tmp"; }
trap cleanup EXIT
psql -X -v ON_ERROR_STOP=1 -d "$src" <<'SQL'
CREATE SCHEMA IF NOT EXISTS p17_synthetic;
CREATE TABLE IF NOT EXISTS p17_synthetic.originals (
  tenant text PRIMARY KEY, original_record text NOT NULL, human_approval text NOT NULL);
INSERT INTO p17_synthetic.originals VALUES
 ('owner_a','source_original_a','withdrawn'),
 ('owner_b','source_original_b','not_collected')
 ON CONFLICT (tenant) DO UPDATE SET original_record=EXCLUDED.original_record,
 human_approval=EXCLUDED.human_approval;
BEGIN;
UPDATE p17_synthetic.originals SET human_approval='falsely_approved',
 original_record='modified_after_compromise' WHERE tenant='owner_a';
ROLLBACK;
DO $$
BEGIN
 IF (SELECT original_record FROM p17_synthetic.originals WHERE tenant='owner_a')<>'source_original_a'
  OR (SELECT human_approval FROM p17_synthetic.originals WHERE tenant='owner_a')<>'withdrawn'
  OR (SELECT human_approval FROM p17_synthetic.originals WHERE tenant='owner_b')<>'not_collected'
 THEN RAISE EXCEPTION 'Original custody or approval rollback changed';END IF;
END $$;
SQL
psql -XAt -d "$src" -c "SELECT tenant,original_record,human_approval FROM p17_synthetic.originals ORDER BY tenant" > "$tmp/before"
stable="$(sha256sum "$tmp/before"|cut -d' ' -f1)"
pg_dump -Fc -f "$tmp/archive" "$src"
archive_sha="$(sha256sum "$tmp/archive"|cut -d' ' -f1)"
createdb "$dest"
pg_restore -e --no-owner --no-acl -d "$dest" "$tmp/archive"
psql -XAt -d "$dest" -c "SELECT tenant,original_record,human_approval FROM p17_synthetic.originals ORDER BY tenant" > "$tmp/after"
[[ "$(sha256sum "$tmp/after"|cut -d' ' -f1)" == "$stable" ]] || { echo 'Original row bytes changed on restore' >&2;exit 4; }
[[ "$(sha256sum "$tmp/archive"|cut -d' ' -f1)" == "$archive_sha" ]] || exit 4
[[ "$(psql -XAt -d "$dest" -c "SELECT human_approval FROM p17_synthetic.originals WHERE tenant='owner_a'")" == withdrawn ]] || exit 4
printf 'invalid-archive' > "$tmp/corrupt"
if pg_restore --list "$tmp/corrupt" >/dev/null 2>&1;then exit 5;fi
echo 'P17 runner-local original-row custody, tenant separation, rollback, archive checksum and corruption refusal PASS'
echo 'No actual consent, physical witness, approved disposable Supabase or production recovery'
