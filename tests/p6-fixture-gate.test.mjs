import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/app/p6-fixture-internal/page.tsx',import.meta.url),'utf8');
test('browser fixture unavailable without exact server-only authorization',()=>{
 assert.match(source,/process\.env\.CONTROL_P6_FIXTURE_MODE!=='ISOLATED_BROWSER_CI'/);
 assert.match(source,/notFound\(\)/);
 assert.doesNotMatch(source,/NEXT_PUBLIC_CONTROL_P6_FIXTURE/);
});
test('browser fixture explicitly disclaims authenticated acceptance',()=>{
 assert.match(source,/NOT AUTHENTICATED ACCEPTANCE/);
 assert.doesNotMatch(source,/SUPABASE_SECRET_KEY/);
});
