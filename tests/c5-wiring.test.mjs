import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
const dashboard=file('components/Dashboard.tsx'),home=file('app/page.tsx'),progress=file('components/ProgressWorkspace.tsx');
test('qualified signed-in owner is passed from server and browser auth changes clear all owner-bound data',()=>{
 assert.match(home,/<Dashboard ownerId=\{data\.user\.id\}/);
 assert.match(dashboard,/onAuthStateChange\(\(event,session\)=>/);
 assert.match(dashboard,/ownerSessionChanged\(event,session\?\.user\?\.id,ownerId\)/);
 for(const update of ['setRows([])','setFocus({week:\'\',items:[]})','setCandidates([])','setRepoLinks([])','setProgressData({targets:[],phases:[],focus:[]})','setSelected(null)','window.location.replace(\'/\')']){
  assert.ok(dashboard.includes(update),update);
 }
 assert.match(dashboard,/subscription\.unsubscribe\(\)/);
});
test('focus objective controls are keyed per project and actual week, and failed writes do not clear drafts',()=>{
 assert.match(progress,/const key=focusDraftKey\(project,f\.week_start\)/);
 assert.match(progress,/objective:focusDraftValue\(objectiveDrafts,project,f\.week_start,i\.objective\)/);
 assert.match(progress,/value=\{focusDraftValue\(objectiveDrafts,project,f\.week_start,i\.objective\)\}/);
 assert.match(progress,/if\(saved\)setObjectiveDrafts\(d=>clearFocusDraft\(d,project,f\.week_start\)\)/);
 assert.doesNotMatch(progress,/value=\{objective\|\|i\.objective\}/);
});
