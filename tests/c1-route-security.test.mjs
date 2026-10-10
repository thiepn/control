import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const route=readFileSync(new URL('../src/app/api/candidates/resolve/route.ts',import.meta.url),'utf8');
test('repository lookup never fetches client-provided hosts and always requires owner/session and origin',()=>{
 assert.match(route,/sameOrigin\(req\)/);assert.match(route,/requireOwner\(\)/);
 assert.match(route,/parseRepositoryName\(input\?\.repository\)/);
 assert.match(route,/https:\/\/api\.github\.com\/repos\//);
 assert.match(route,/p_owner:auth\.ownerId/);
 assert.doesNotMatch(route,/fetch\(input\./);
 assert.doesNotMatch(route,/NEXT_PUBLIC_.*(TOKEN|SECRET)/);
});
