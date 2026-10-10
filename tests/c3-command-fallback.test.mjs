import test from 'node:test';
import assert from 'node:assert/strict';
import {focusWhenProgressUnavailable} from '../src/lib/control-command.mjs';
const p=(id,lifecycle='active',action='Finish scoped work')=>({id,title:id,lifecycle,next_action:action});
test('manual focus remains visible without phases or milestones, never invents progress',()=>{
 const result=focusWhenProgressUnavailable([p('a'),p('b')],[{project_id:'a',slot:1}]);
 assert.equal(result.next.project.id,'a');
 assert.equal(result.next.action,'Finish scoped work');
 assert.equal(result.next.source,'focus_unverified');
 assert.equal(result.phaseUnavailable,true);
 assert.equal(result.summary.size,0);
});
test('fallback never picks an unselected project or blocked lifecycle as inferred ready',()=>{
 assert.equal(focusWhenProgressUnavailable([p('ready')],[]).next,null);
 assert.equal(focusWhenProgressUnavailable([p('waiting','waiting')],[{project_id:'waiting',slot:1}]).next,null);
 assert.equal(focusWhenProgressUnavailable([p('arch','archived')],[{project_id:'arch',slot:1}]).next,null);
});
test('manual priority order uses slot; missing next action explicitly stays missing',()=>{
 const r=focusWhenProgressUnavailable([p('a'),p('b','planned','')],[{project_id:'a',slot:3},{project_id:'b',slot:1}]);
 assert.equal(r.next.project.id,'b');assert.equal(r.next.action,null);
});
