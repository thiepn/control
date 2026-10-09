import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProject, assertFocus, weekStart, orderProjects } from '../src/lib/rules.mjs';
test('create requires meaningful name and slug',()=>{
 assert.deepEqual(parseProject({title:' Example ',slug:'example'}, {create:true}),{title:'Example',slug:'example'});
 assert.throws(()=>parseProject({title:'Hi'}, {create:true}));
 assert.throws(()=>parseProject({title:'',slug:'ok'}, {create:true}));
});
test('rejects forged data authority and unrecognized fields',()=>{
 for(const key of ['owner_id','completion_fraction','evidence_grade','verified_at','manual_rank','version','is_current']) assert.throws(()=>parseProject({title:'Okay',slug:'okay',[key]:'spoof'}, {create:true}),/Forbidden field/);
 assert.throws(()=>parseProject({lifecycle:'verified'}));
 assert.throws(()=>parseProject({priority:'P8'}));
});
test('deadlines are optional, paired, and strictly validated',()=>{
 assert.deepEqual(parseProject({title:'No deadline',slug:'no-deadline'}, {create:true}),{title:'No deadline',slug:'no-deadline'});
 assert.throws(()=>parseProject({title:'Broken',slug:'broken',deadline_date:'2026-02-30',deadline_kind:'hard'},{create:true}));
 assert.throws(()=>parseProject({title:'Incomplete',slug:'incomplete',deadline_date:'2026-10-10'},{create:true}));
 assert.deepEqual(parseProject({deadline_date:null}),{deadline_date:null,deadline_kind:null});
});
test('weekly focus is bounded and deduplicated',()=>{
 const ids=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003'];
 assert.deepEqual(assertFocus(ids),ids);assert.throws(()=>assertFocus([...ids,ids[0]]));assert.throws(()=>assertFocus([ids[0],ids[0]]));
 assert.equal(weekStart(new Date('2026-10-09T21:00:00Z')),'2026-10-05');
});
test('sorting never alters manual rank',()=>{
 const p=[{id:'b',title:'Zulu',priority:'P3',manual_rank:1},{id:'a',title:'Alpha',priority:'P1',manual_rank:2}];
 assert.deepEqual(orderProjects(p,'priority').map(x=>x.id),['a','b']);assert.deepEqual(orderProjects(p,'manual').map(x=>x.id),['b','a']);assert.equal(p[0].manual_rank,1);
});
