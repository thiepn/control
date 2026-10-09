import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../scripts/p6-auth-preflight.mjs',import.meta.url),'utf8');
const suite=readFileSync(new URL('./browser/operations.auth.spec.mjs',import.meta.url),'utf8');
test('real two-account suite requires independent sessions and disposable hostname',()=>{
 assert.match(script,/I_ACKNOWLEDGE_DISPOSABLE_PROJECT/);
 assert.match(script,/CONTROL_P6_REVIEWED_SUPABASE_HOST/);
 assert.match(script,/Two independently authenticated browser contexts required/);
 assert.match(suite,/getByRole\('navigation'/);
 assert.match(suite,/other\.json\(\)/);
});
test('real browser suite checks UI sign-out, owner isolation, durable race and audited cleanup',()=>{
 assert.match(suite,/getByRole\('button',\{name:\/Sign out\/\}\)\.click\(\)/);
 assert.match(suite,/b\.request\.get\('\/api\/projects'\)/);
 assert.match(suite,/conflicts\.length\)\.toBe\(1\)/);
 assert.match(suite,/persisted\.version\)\.toBe\(project\.version\)/);
 assert.match(suite,/expect\(cleaned\.ok\(\)\)\.toBe\(true\)/);
});
