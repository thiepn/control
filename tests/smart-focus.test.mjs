import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeFocus,focusByLane,renderFocusCard,verifiedDeadline} from '../public/focus.js';
import {createWorker} from '../src/worker.js';
const sample=[{repo_url:'https://github.com/thiepn/my-daily-devotion',title:'my-daily-devotion',priority:'P0',progress:null},{repo_url:'https://github.com/thiepn/library',title:'library',priority:'P1',progress:null}];
const make=(repo,rank,lane='act_now')=>({repo_url:repo,rank,lane,headline:'Fix source',rationale:'Real failed CI',next_action:'Read failure log',constraint_note:'Owner approval pending',evidence_url:'https://github.com/thiepn/my-daily-devotion/actions/runs/38085373681',confidence:'high',deadline_date:null,deadline_evidence_url:null});
test('R4 shortlist never invents urgency, deadlines, percentage or changes to saved priority',()=>{
 const x=normalizeFocus([make(sample[1].repo_url,2,'waiting'),make(sample[0].repo_url,1)],sample);
 assert.deepEqual(x.map(z=>z.rank),[1,2]);
 assert.deepEqual(x.map(z=>z.project.priority),['P0','P1']);
 assert.equal(x[0].project.progress,null);
 assert.equal(verifiedDeadline(x[0]),'No verified deadline');
 assert.deepEqual(focusByLane(x).waiting.map(x=>x.rank),[2]);
});
test('R4 drops duplicate, orphaned and unsafe evidence and requires source for a deadline',()=>{
 let x=normalizeFocus([make(sample[0].repo_url,1),make(sample[0].repo_url,2),make('https://github.com/thiepn/unlinked',3),{...make(sample[1].repo_url,4),evidence_url:'javascript:alert(1)'}],sample);
 assert.equal(x.length,1);
 x=normalizeFocus([{...make(sample[0].repo_url,1),deadline_date:'2026-11-01'}],sample);
 assert.equal(x[0].deadline_date,null);assert.equal(verifiedDeadline(x[0]),'No verified deadline');
});
test('R4 decision cards escape text, link original source and show unknown deadline',()=>{
 const x=normalizeFocus([{...make(sample[0].repo_url,1),headline:'<script>alert(1)</script>',dependency_note:'PR <img onerror=alert(1)>',dependency_url:'https://github.com/thiepn/library/pull/162'}],sample)[0];
 const card=renderFocusCard(x);
 assert.doesNotMatch(card,/<script>|<img/);assert.match(card,/&lt;script&gt;/);assert.match(card,/No verified deadline/);assert.match(card,/KNOWN PREREQUISITE/);assert.match(card,/#project\/my-daily-devotion/);
});
test('R4 private API returns only source-linked focus and is non-writable',async()=>{
 const db={prepare(sql){assert.match(sql,/^SELECT f\.rank/);return {all:async()=>({results:[make(sample[0].repo_url,1)]})}}};
 const env={DB:db,ASSETS:{fetch:async()=>new Response('ok')},ACCESS_TEAM_DOMAIN:'https://example.cloudflareaccess.com',ACCESS_AUD:'aud',OWNER_EMAIL:'owner@example.com'};
 const request=(method='GET')=>new Request('https://control.thiepn.dev/api/focus',{method,headers:method==='GET'?{}:{origin:'https://control.thiepn.dev'}});
 assert.equal((await createWorker(async()=>true).fetch(request(),{...env,OWNER_EMAIL:''})).status,503);
 assert.equal((await createWorker(async()=>false).fetch(request(),env)).status,403);
 const r=await createWorker(async()=>true).fetch(request(),env);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal((await r.json()).items.length,1);
 assert.equal((await createWorker(async()=>true).fetch(request('POST'),env)).status,404);
});
test('R4 exact production module includes all five private static assets and focus API',()=>{
 const prod=fs.readFileSync('src/production.js','utf8');
 for(const p of ['index.html','styles.css','app.js','briefings.js','focus.js'])assert.ok(prod.includes(JSON.stringify(fs.readFileSync('public/'+p,'utf8'))),p);
 const app=fs.readFileSync('public/app.js','utf8');
 assert.match(app,/\/api\/focus/);assert.match(app,/state\.focusRecommendations/);
 assert.match(fs.readFileSync('public/index.html','utf8'),/id="focusWaiting"/);
});
