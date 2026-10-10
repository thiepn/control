import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dashboard=readFileSync(new URL('../src/components/Dashboard.tsx',import.meta.url),'utf8');
const progress=readFileSync(new URL('../src/components/ProgressWorkspace.tsx',import.meta.url),'utf8');
test('Command derives unverified manual focus independently of progress API and clearly marks partial connectivity',()=>{
 assert.match(dashboard,/focusWhenProgressUnavailable\(rows,focus\.items\)/);
 assert.match(dashboard,/progressState==='ready'\?commandSnapshot/);
 assert.match(dashboard,/PHASE UNAVAILABLE/);
 assert.match(dashboard,/PARTIAL DATA/);
 assert.match(dashboard,/CONNECTION FAILED/);
 assert.match(dashboard,/Retry connection/);
 assert.doesNotMatch(dashboard,/SYNCED TO BACKEND/);
});
test('owner manually creates unassessed project during review, not by GitHub import',()=>{
 assert.match(dashboard,/id="review-new-project"/);
 assert.match(dashboard,/onSubmit=\{e=>\{e\.preventDefault\(\);add\(\);\}\}/);
 assert.match(dashboard,/Create project in inbox/);
 assert.match(dashboard,/projectId:action==='link'\?candidateTargets\[c\.id\]:undefined/);
});
test('Post-write reread failures are shown as uncertain readback, not mutation failure',()=>{
 assert.match(progress,/Saved to the database, but the refreshed dashboard could not be loaded/);
});

test('Candidate intake failure is isolated from primary authenticated project and focus reads',()=>{
 assert.match(dashboard,/const \[p,f\]=await Promise\.all/);
 assert.match(dashboard,/const \[candidates,links,progress\]=await Promise\.allSettled/);
 assert.match(dashboard,/Repository review unavailable\. Core project planning remains accessible/);
 assert.match(dashboard,/candidates\.status==='fulfilled'&&links\.status==='fulfilled'&&progress\.status==='fulfilled'/);
});
