import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {observationFingerprint,observe,reviseReview,reviseFocus,startRun,finishRun,ownerRepo,githubEvidence} from '../src/refresh-engine.js';
import {freshness,metrics,renderRefresh} from '../public/freshness.js';
import {createWorker} from '../src/worker.js';
const repo='https://github.com/thiepn/control';
const good={repo_url:repo,source_url:repo+'/pull/24',default_branch:'main',latest_pr_number:24,latest_pr_head:'a'.repeat(40),latest_ci_id:38094336761,latest_ci_conclusion:'success',last_pushed_at:'2026-10-10T23:10:00Z',run_id:'r5-test',expected_revision:0};
test('source fingerprint is stable, scoped to GitHub and rejects unreliable inputs',()=>{
 assert.equal(observationFingerprint(good),observationFingerprint({...good,expected_revision:5}));
 assert.ok(ownerRepo(repo));assert.ok(githubEvidence(repo+'/pull/24',repo));
 assert.throws(()=>observationFingerprint({...good,source_url:'https://attacker.test/'}));
 assert.throws(()=>observationFingerprint({...good,latest_pr_head:'not-a-sha'}));
});
test('same source is idempotent; stale revision conflicts, changed source advances revision',async()=>{
 let current=null,events=[];
 const db={prepare(sql){return {bind(...params){return {async first(){return current?{revision:current.revision,fingerprint:current.fingerprint}:null},async run(){if(!sql.startsWith('INSERT INTO source_observations'))throw Error('bad SQL');const expected=params.at(-1);if(current&&current.revision!==expected)return {meta:{changes:0}};const fingerprint=params[1];if(!current){current={revision:1,fingerprint};events.push('insert')}else if(current.fingerprint!==fingerprint){current={revision:current.revision+1,fingerprint};events.push('change')}return {meta:{changes:1}}}}}}}};
 assert.equal((await observe(db,good)).status,'new');
 assert.equal((await observe(db,{...good,expected_revision:1})).status,'unchanged');
 assert.equal((await observe(db,good)).status,'conflict');
 assert.equal((await observe(db,{...good,latest_ci_id:38094336762,expected_revision:1})).status,'changed');
 assert.deepEqual(events,['insert','change']);assert.equal(current.revision,2);
 const zeroMetaDb={prepare(sql){return {bind(){return {first:async()=>({revision:1,fingerprint:observationFingerprint(good)}),run:async()=>({meta:{changes:0}})}}}}};
 const result=await observe(zeroMetaDb,{...good,expected_revision:1});
 assert.equal(result.status,'unchanged');
});
test('AI updates require exact review/focus revisions and cannot overwrite project priority or progress',async()=>{
 const queries=[];const db={prepare(sql){return {bind(...params){return {async run(){queries.push({sql,params});return {meta:{changes:params.at(-1)===0?1:0}}}}}}}};
 const x=await reviseReview(db,{repo_url:repo,expected_revision:0,run_id:'r5-test',category:'Platform',stage:'R5',summary:'Source-backed',blocker:'Unverified owner acceptance',recommendation:'Check original',evidence_url:repo+'/pull/24',confidence:'high',evidence_depth:'PR metadata'});
 assert.equal(x.status,'updated');
 const y=await reviseFocus(db,{repo_url:repo,rank:1,expected_revision:1,run_id:'r5-test',headline:'Review original',rationale:'Evidence',next_action:'Check current CI',constraint_note:'Owner approval needed',evidence_url:repo+'/actions/runs/38094336761',confidence:'high',lane:'prepare'});
 assert.equal(y.status,'conflict');assert.equal(queries.length,2);
 for(const q of queries){assert.doesNotMatch(q.sql,/\bprojects SET|\bprogress=|\bpriority=/);assert.match(q.sql,/refresh_version=\?/);}
 assert.throws(()=>observationFingerprint({...good,repo_url:'https://github.com/evil/control'}));
 await assert.rejects(()=>reviseFocus(db,{repo_url:repo,rank:1,expected_revision:0,run_id:'r5-test',headline:'x',rationale:'r',next_action:'n',constraint_note:'c',evidence_url:repo+'/pull/24',confidence:'high',lane:'act_now',deadline_date:'2026-11-01'}));
});
test('run status transitions are one-way and explicit',async()=>{
 let started=false,finished=false;
 const db={
   prepare: sql=>({
     bind: ()=>({
       run: async()=>{
         if(sql.startsWith('INSERT')){if(started)return {meta:{changes:0}};started=true;return {meta:{changes:1}};}
         if(sql.startsWith('UPDATE')){if(finished)return {meta:{changes:0}};finished=true;return {meta:{changes:1}};}
         throw Error(sql);
       }
     })
   })
 };
 assert.deepEqual(await startRun(db,'r5-test'),{started:true});
 assert.deepEqual(await startRun(db,'r5-test'),{started:false});
 assert.deepEqual(await finishRun(db,'r5-test',{status:'partial',checked:2,changed:1}),{recorded:true});
 assert.deepEqual(await finishRun(db,'r5-test',{status:'succeeded'}),{recorded:false});
});
test('missing/stale sources are not counted as checked',()=>{
 const now=Date.parse('2026-10-11T12:00:00Z');
 const p=[{repo_url:repo,priority:'P0'},{repo_url:repo+'/other',priority:'P3'}];
 assert.equal(freshness(p[0],null,now),'untracked');
 const stale={repo_url:repo,last_checked_at:'2026-10-01 10:00:00'};
 assert.equal(freshness(p[0],stale,now),'stale');
 assert.deepEqual(metrics(p,[stale],now),{total:2,current:0,stale:1,untracked:1,unknown:0,tracked:1});
 assert.match(renderRefresh({runs:[],observations:[],events:[]},p,now),/No refresh run recorded/);
});
test('R5 is authenticated, read-only, no-store; exact bundled assets align with source',async()=>{
 const env={DB:{prepare(sql){return {all:async()=>({results:sql.includes('source_observations')?[{repo_url:repo}]:[]})}}},ASSETS:{fetch:async()=>new Response('ok')},ACCESS_TEAM_DOMAIN:'https://example.cloudflareaccess.com',ACCESS_AUD:'aud',OWNER_EMAIL:'owner@example.com'};
 const request=(method='GET')=>new Request('https://control.thiepn.dev/api/refresh',{method,headers:method==='GET'?{}:{origin:'https://control.thiepn.dev'}});
 assert.equal((await createWorker(async()=>false).fetch(request(),env)).status,403);
 const out=await createWorker(async()=>true).fetch(request(),env);assert.equal(out.status,200);assert.equal(out.headers.get('cache-control'),'private, no-store');assert.equal((await out.json()).observations.length,1);
 assert.equal((await createWorker(async()=>true).fetch(request('POST'),env)).status,404);
 const prod=fs.readFileSync('src/production.js','utf8');
 for(const name of ['index.html','styles.css','app.js','briefings.js','focus.js','freshness.js'])assert.ok(prod.includes(JSON.stringify(fs.readFileSync('public/'+name,'utf8'))),name);
});
