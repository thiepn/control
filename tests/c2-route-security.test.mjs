import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/app/api/'+path,import.meta.url),'utf8');
test('discovery requires real authenticated owner for reads and same-origin for writes',()=>{
 const s=read('candidates/discover/route.ts');
 assert.match(s,/requireOwner\(\)/);assert.match(s,/sameOrigin\(req\)/);
 assert.match(s,/p_owner:auth\.ownerId/);
 assert.match(s,/ids\.some\(id=>!found\.has\(id\)\)/);
 assert.doesNotMatch(s,/repo\.full_name:body/);
});
test('project-repository mapping is only read through authenticated RLS client',()=>{
 const s=read('portfolio/repositories/route.ts');
 assert.match(s,/requireOwner\(\)/);
 assert.match(s,/auth\.reader\.from\('project_repository_links'\)/);
 assert.match(s,/auth\.reader\.from\('github_repositories'\)/);
 assert.doesNotMatch(s,/adminClient|auth\.writer/);
});

test('private installation discovery and direct GitHub lookups are restricted to the configured authenticated owner',()=>{
 const list=read('candidates/discover/route.ts');
 const resolve=read('candidates/resolve/route.ts');
 assert.match(list,/githubPrivateAccessAllowed\(auth\.ownerId\)/);
 assert.match(resolve,/githubPrivateAccessAllowed\(auth\.ownerId\)/);
 assert.match(list,/403/);assert.match(resolve,/403/);
});
