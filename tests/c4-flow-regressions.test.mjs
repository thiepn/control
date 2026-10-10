import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=s=>readFileSync(new URL('../src/'+s,import.meta.url),'utf8');
const http=file('lib/http.ts'),home=file('app/page.tsx'),login=file('components/Login.tsx'),
 dashboard=file('components/Dashboard.tsx'),progress=file('components/ProgressWorkspace.tsx');
test('private API writer checks allowlisted getUser BEFORE constructing service writer',()=>{
 assert.match(http,/client\.auth\.getUser\(\)/);
 assert.match(http,/!controlOwnerAllowed\(data\.user\.id\)/);
 assert.ok(http.indexOf('!controlOwnerAllowed(data.user.id)')<http.indexOf('return { ownerId: data.user.id, reader: client, writer: adminClient() }'));
 assert.match(home,/controlOwnerConfigured\(\)/);
 assert.match(home,/controlOwnerAllowed\(data\.user\.id\)\?<Dashboard ownerId=\{data\.user\.id\}\/>:<AccessDenied\/>/);
});
test('magic link does not silently register unknown users and denied owners can sign out',()=>{
 assert.match(login,/shouldCreateUser:false/);
 assert.match(file('components/AccessDenied.tsx'),/auth\.signOut\(\)/);
});
test('committed portfolio writes are never presented as failed solely because follow-up reads failed',()=>{
 assert.match(dashboard,/try\{await task\(\);\}catch/);
 assert.match(dashboard,/Write may have succeeded, but dashboard read-back failed/);
});
test('new milestones display Unassessed rather than fabricating 0 percent',()=>{
 assert.match(progress,/value=\{m\.completion_fraction===null\?'':m\.completion_fraction\}/);
 assert.match(progress,/<option value="" disabled>Unassessed<\/option>/);
 assert.match(progress,/if\(e\.target\.value!==''\)act\('milestone\.report'/);
});

test('failed milestone writes preserve the entered milestone name for retry',()=>{
 assert.match(progress,/catch\(e\)\{setMessage\(e instanceof Error\?e\.message:'Action failed'\);return false;/);
 assert.match(progress,/\.then\(saved=>\{if\(saved\)setMilestone\(''\);\}\)/);
 assert.doesNotMatch(progress,/\.then\(\(\)=>setMilestone\(''\)\)/);
});
