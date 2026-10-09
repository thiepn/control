import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(file)=>readFileSync(new URL('../src/app/api/operations/'+file,import.meta.url),'utf8');
test('all P5 read routes require current authenticated owner',()=>{
 for(const route of ['overview/route.ts','audit/route.ts','reviews/route.ts']){
  assert.match(read(route),/requireOwner\(\)/);
  assert.match(read(route),/Unauthorized/);
 }
});
test('weekly review write enforces same-origin and derives owner from session',()=>{
 const source=read('reviews/route.ts');
 assert.match(source,/sameOrigin\(req\)/);
 assert.match(source,/p_owner:auth\.ownerId/);
 assert.match(source,/p_expected_version:expected/);
 assert.doesNotMatch(source,/p_owner:input\.owner_id/);
});
test('audit queries are paginated, bounded, and read through RLS client only',()=>{
 const source=read('audit/route.ts');
 assert.match(source,/page>20/);
 assert.match(source,/auth\.reader\.from\('audit_log'\)/);
 assert.match(source,/\.range\(page\*30,page\*30\+30\)/);
 assert.doesNotMatch(source,/auth\.writer/);
});
test('integration diagnostics never return credentials',()=>{
 const source=read('overview/route.ts');
 assert.match(source,/!!\(process\.env\.GITHUB_APP_ID/);
 assert.doesNotMatch(source,/return json\(\{.*GITHUB_APP_PRIVATE_KEY/);
});
