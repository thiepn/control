import test from 'node:test';
import assert from 'node:assert/strict';
import {berlinDate,summarizeProjects,selectNextAction} from '../src/lib/control-command.mjs';
import {parseRepositoryName} from '../src/lib/repo-name.mjs';
const project=(id,patch={})=>({id,title:id,lifecycle:'active',priority:'P1',next_action:'Ship scoped UI',...patch});
const milestone=(fraction,grade='user_reported',verified=false)=>({
 weight:2,completion_fraction:fraction,evidence_grade:grade,release_gate:'none',
 gate_passed:null,verified_at:verified?'2026-10-10':null,verified_by:verified?'human':null
});
test('Command chooses explicitly selected focus first, never fabricates an action',()=>{
 const rows=[project('a',{next_action:null}),project('b')];
 const result=selectNextAction(rows,[{id:'b',score:90}],[{slot:1,project_id:'a'}],[]);
 assert.equal(result.project.id,'a');assert.equal(result.action,null);assert.equal(result.source,'weekly_focus');
 assert.equal(selectNextAction([project('c',{lifecycle:'paused'})],[],[],[]),null);
});
test('blocked projects and phases are not recommended, but next recorded work is',()=>{
 const rows=[project('a'),project('b',{next_action:'Finish tests'}),project('c',{lifecycle:'waiting'})];
 const next=selectNextAction(rows,[{id:'a',score:100},{id:'c',score:90},{id:'b',score:65}],
  [{slot:1,project_id:'a'}],[{project_id:'a',state:'blocked'}]);
 assert.equal(next.project.id,'b');assert.equal(next.action,'Finish tests');
});
test('phase and percent distinguish reported, verified, unassessed, and no phase',()=>{
 const rows=[project('a'),project('b')];
 const targets=[{project_id:'a',name:'Release A',milestones:[milestone(0.5)]}];
 const phases=[{project_id:'a',phase_key:'P3',title:'Build',state:'in_progress'},
               {project_id:'a',phase_key:'P4',title:'Review',state:'planned'}];
 const result=summarizeProjects(rows,targets,phases);
 assert.equal(result.get('a').progress.reported,50);
 assert.equal(result.get('a').progress.verified,0);
 assert.equal(result.get('a').phase.key,'P3');
 assert.equal(result.get('b').progress.reported,null);
 assert.equal(result.get('b').phase,null);
 const verified=summarizeProjects(rows,[{project_id:'a',name:'release',milestones:[milestone(1,'verified',true)]}],[]);
 assert.equal(verified.get('a').progress.verified,100);
});
test('Berlin-local day boundary is not browser timezone or UTC',()=>{
 assert.equal(berlinDate(new Date('2026-10-10T22:30:00.000Z')),'2026-10-11');
});
test('repository names accept only GitHub root repository identifiers',()=>{
 assert.equal(parseRepositoryName('https://github.com/thiepn/control/'),'thiepn/control');
 assert.equal(parseRepositoryName('thiepn/control'),'thiepn/control');
 for(const input of ['https://github.com.evil/a/b','https://github.com/a/b/issues','a/b?admin=true','../secret','a/..','https://evil.example/a/b','a/b#key'])
   assert.equal(parseRepositoryName(input),null,input);
});
