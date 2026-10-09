import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateProject,prioritizePortfolio,ENGINE_VERSION} from '../src/lib/prioritization.mjs';
const base={id:'a',title:'Alpha',priority:'P1',lifecycle:'active',deadline_date:null,deadline_kind:null,next_action:'Ship patch',version:4};
test('all scores are explainable, deterministic, and bounded',()=>{
 const a=evaluateProject(base,{today:'2026-10-10'}),b=evaluateProject(base,{today:'2026-10-10'});
 assert.deepEqual(a,b);assert.equal(a.source,ENGINE_VERSION);
 assert.equal(a.score,a.factors.reduce((n,x)=>n+x.points,0));
 assert.ok(a.factors.some(x=>x.key==='manual_priority'));
 assert.ok(a.score>=0&&a.score<=100);
});
test('deadline urgency and hard deadline increase priority, without invented dates',()=>{
 const plain=evaluateProject(base,{today:'2026-10-10'});
 const late=evaluateProject({...base,deadline_date:'2026-10-01',deadline_kind:'hard'},{today:'2026-10-10'});
 assert.ok(late.score>plain.score);
 assert.equal(late.factors.some(x=>x.key==='deadline_overdue'),true);
 assert.equal(plain.factors.some(x=>x.key==='deadline_overdue'),false);
 assert.throws(()=>evaluateProject(base,{today:'invalid'}));
});
test('blocked work is explained and not suggested for focus',()=>{
 const waiting={...base,id:'w',title:'Wait',lifecycle:'waiting'};
 const result=prioritizePortfolio([waiting,base],{today:'2026-10-10',phases:[{project_id:'a',state:'blocked'}]});
 assert.equal(result.focusSuggestions.length,0);
 assert.ok(result.ranked.every(x=>x.blocked));
 assert.ok(result.ranked.find(x=>x.id==='a').factors.some(x=>x.key==='blocked_phase'));
});
test('capacity never exceeds slots, avoids duplicates and preserves existing selections',()=>{
 const rows=Array.from({length:5},(_,i)=>({...base,id:'p'+i,title:'Project '+i}));
 const p=prioritizePortfolio(rows,{today:'2026-10-10',capacity:3,focusIds:['p0','p1']});
 assert.equal(p.focusSuggestions.length,1);
 assert.equal(p.focusSuggestions[0].id,'p2');
 assert.equal(prioritizePortfolio(rows,{today:'2026-10-10',focusIds:['p0','p1','p2']}).focusSuggestions.length,0);
 assert.throws(()=>prioritizePortfolio(rows,{today:'2026-10-10',capacity:4}));
 assert.throws(()=>prioritizePortfolio(rows,{today:'2026-10-10',focusIds:['p1','p1']}));
});
test('completed and archived projects never receive new priority or focus suggestions',()=>{
 const rows=[{...base,lifecycle:'completed'},{...base,id:'b',lifecycle:'archived'}];
 assert.equal(prioritizePortfolio(rows,{today:'2026-10-10'}).ranked.length,0);
});
