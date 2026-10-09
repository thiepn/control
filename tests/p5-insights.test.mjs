import test from 'node:test';
import assert from 'node:assert/strict';
import {mondayOf,berlinDay,summarizePortfolio,diagnoseIntegrations} from '../src/lib/portfolio-insights.mjs';
test('Monday calculation survives year transitions and timezone changes',()=>{
 assert.equal(mondayOf('2027-01-01'),'2026-12-28');
 assert.equal(mondayOf('2026-10-10'),'2026-10-05');
 assert.equal(berlinDay(new Date('2026-03-29T22:30:00Z')),'2026-03-30');
 assert.throws(()=>mondayOf('2026-02-30'));
});
test('summaries never count self-reports or unsupported gates as verified',()=>{
 const m=(grade,extra={})=>({evidence_grade:grade,verified_at:null,verified_by:null,release_gate:'none',...extra});
 const s=summarizePortfolio({projects:[
 {id:'1',lifecycle:'active',priority:'P1',deadline_date:'2026-10-09',deadline_kind:'hard',next_action:''},
 {id:'2',lifecycle:'waiting',priority:null,deadline_date:'2026-10-13',next_action:'wait'},
 {id:'3',lifecycle:'archived',priority:'P2',deadline_date:'2026-10-01',next_action:''}
 ],phases:[{project_id:'2',state:'blocked'},{project_id:'2',state:'blocked'}],
 milestones:[m('user_reported'),m('verified'),m('verified',{verified_at:'2026-10-09',verified_by:'ci',release_gate:'human',gate_passed:false}),
 m('verified',{verified_at:'2026-10-09',verified_by:'operator'})],
 focus:[{week_start:'2026-10-05',focus_items:[{project_id:'1'},{project_id:'1'}]}],
 reviews:[{state:'submitted',week_start:'2026-10-05'}],partial:true},'2026-10-10');
 assert.equal(s.projects.total,3);
 assert.equal(s.projects.overdue,1);
 assert.equal(s.projects.approaching,1);
 assert.equal(s.projects.blockedPhaseProjects,1);
 assert.equal(s.projects.missingNextAction,1);
 assert.equal(s.milestones.verified,1);
 assert.equal(s.focus.selected,1);
 assert.equal(s.reviews.currentWeekSubmitted,true);
 assert.equal(s.partial,true);
});
test('integration diagnostics distinguish configured from verified connectivity',()=>{
 const x=diagnoseIntegrations({githubAppConfigured:true,webhookConfigured:false,linked:2,events:4,
 latestEvent:'2026-10-01T00:00:00Z',at:'2026-10-10T12:00:00Z'});
 assert.equal(x[0].status,'configured');
 assert.match(x[0].detail,/not tested/);
 assert.equal(x[1].status,'not_configured');
 assert.equal(x[3].status,'stale');
 assert.equal(diagnoseIntegrations({at:'2026-10-10T00:00:00Z'})[3].status,'none');
});
test('rejects ambiguous dates or invalid data rather than inventing findings',()=>{
 assert.throws(()=>summarizePortfolio({},'today'));
 assert.throws(()=>summarizePortfolio({projects:null},'2026-10-10'));
 assert.throws(()=>diagnoseIntegrations({at:'invalid'}));
});
