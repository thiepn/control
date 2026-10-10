#!/usr/bin/env bash
# Negative proof: damaged synthetic backup must not be interpreted as restorable.
set -euo pipefail
[[ "$(id -un)" == postgres ]] || { echo "Only isolated runner-local postgres user" >&2; exit 2; }
for setting in PGHOST PGSERVICE DATABASE_URL PGPORT PGUSER; do
 [[ -z "$(printenv "$setting" 2>/dev/null || true)" ]] || { echo "External database settings denied" >&2; exit 2; }
done
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='control_p6_test'")" == 1 ]] ||
 { echo "Disposable seeded runner DB missing" >&2; exit 2; }
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
pg_dump -Fc -f "$dir/backup.dump" control_p6_test
sha256sum "$dir/backup.dump" | awk '{print $1}' > "$dir/sha256"
pg_restore --list "$dir/backup.dump" > "$dir/list"
[[ -s "$dir/list" ]] || exit 3
printf 'P11_DELIBERATELY_CORRUPTED_NOT_RESTORABLE' > "$dir/corrupted.dump"
[[ "$(sha256sum "$dir/corrupted.dump" | awk '{print $1}')" != "$(cat "$dir/sha256")" ]] || exit 3
if pg_restore --list "$dir/corrupted.dump" >/dev/null 2>&1; then
 echo "Corrupted backup falsely accepted" >&2; exit 3
fi
[[ "$(psql -XAt -d postgres -c "SELECT 1 FROM pg_database WHERE datname='control_p6_test'")" == 1 ]] || exit 3
echo "P11 real runner-local dump checksum, valid listing and corrupted-backup refusal: PASS"
echo "Not a real Supabase restore or signed human approval"
