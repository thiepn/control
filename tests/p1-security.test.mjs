import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const base=readFileSync(new URL('../db/schema.sql', import.meta.url),'utf8');
const app=readFileSync(new URL('../db/p1-app.sql',import.meta.url),'utf8');
const admin=readFileSync(new URL('../src/lib/supabase/admin.ts',import.meta.url),'utf8');
test('P1 SQL preserves owner-scoped read-only browser RLS',()=>{
 assert.match(base,/ENABLE ROW LEVEL SECURITY/);
 assert.match(base,/GRANT SELECT ON public/);
 assert.doesNotMatch(base,/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)\s+ON public\.%I TO authenticated/i);
 assert.match(app,/CREATE POLICY candidate_owner_read/);
 assert.match(app,/auth\.uid\(\)/);
});
test('privileged functions are service-role-only and audit mutations',()=>{
 for(const name of ['control_mutate_project','control_replace_focus','control_review_candidate','control_intake_candidates','control_move_project']) {
 assert.match(app,new RegExp(`CREATE FUNCTION public\\.${name}`));
 assert.match(app,new RegExp(`REVOKE ALL ON FUNCTION public\\.${name}.*FROM PUBLIC,anon,authenticated`));
 assert.match(app,new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${name}.*TO service_role`));
 }
 assert.match(app,/public\.audit_log/);
 assert.match(app,/pg_advisory_xact_lock/);
});
test('browser bundle must not contain server secret name',()=>{
 const fs=readFileSync(new URL('../src/components/Dashboard.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(fs,/SUPABASE_SECRET_KEY|service_role/);
 assert.match(admin,/import 'server-only'/);
});

test('all authenticated browser mutation endpoints enforce same-origin',()=>{
 for(const route of [
  '../src/app/api/projects/route.ts',
  '../src/app/api/projects/[id]/route.ts',
  '../src/app/api/projects/[id]/rank/route.ts',
  '../src/app/api/focus/route.ts',
  '../src/app/api/candidates/route.ts',
  '../src/app/api/candidates/[id]/route.ts'
 ]) {
  const source=readFileSync(new URL(route,import.meta.url),'utf8');
  assert.match(source,/if\s*\(!sameOrigin\(req\)\)\s*return json\(\{error:/,route);
 }
});
