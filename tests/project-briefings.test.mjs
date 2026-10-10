import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorker} from '../src/worker.js';
import {briefLink,renderBriefing} from '../public/briefings.js';
test('R3 deep links, unknown scores and escaping',()=>{
 const p={title:'unsafe <script>',repo_url:'https://github.com/thiepn/studyOS',priority:'P0',status:'active',progress:null};
 assert.equal(briefLink(p),'#project/studyOS');assert.equal(briefLink({repo_url:'https://github.com/thiepn/unsafe?query'}),'#portfolio');
 const source={category:'Study & Learning',stage:'F22',summary:'Evidence <script>',recommendation:'Test real use',evidence_url:'https://github.com/thiepn/studyOS/pull/55',confidence:'high',evidence_depth:'PR metadata'};
 const html=renderBriefing(p,source,[]);
 assert.match(html,/Unverified/);assert.match(html,/Unknown — no milestone denominator/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 assert.match(html,/Release & owner gates/);
});
test('R3 evidenced dimension cannot imply full release approval',()=>{
 const p={title:'MDD',repo_url:'https://github.com/thiepn/my-daily-devotion',progress:null};
 const rows=[{repo_url:p.repo_url,kind:'milestone',dimension:'implementation',state:'confirmed',label:'Source done',detail:'Merged',evidence_url:'https://github.com/thiepn/my-daily-devotion/pull/76'},{repo_url:p.repo_url,kind:'gate',dimension:'release',state:'blocked',label:'No-go',detail:'Screenshot failed',evidence_url:'https://github.com/thiepn/my-daily-devotion/pull/76'}];
 const x=renderBriefing(p,{recommendation:'Fix release',evidence_depth:'PR metadata'},rows);
 assert.match(x,/Source done/);assert.match(x,/No-go/);assert.match(x,/Blocked/);assert.match(x,/Unknown — no milestone denominator/);
});
test('private signal API is read-only, authenticated and never cacheable',async()=>{
 const environment={DB:{prepare(sql){assert.match(sql,/^SELECT repo_url,signal_key/);return {all:async()=>({results:[{repo_url:'https://github.com/thiepn/control',state:'confirmed'}]})}}},ASSETS:{fetch:async()=>new Response('ok')},ACCESS_TEAM_DOMAIN:'https://personal.cloudflareaccess.com',ACCESS_AUD:'test',OWNER_EMAIL:'owner@example.com'};
 const request=(method='GET')=>new Request('https://control.thiepn.dev/api/signals',{method,headers:method==='GET'?{}:{origin:'https://control.thiepn.dev'}});
 assert.equal((await createWorker(async()=>true).fetch(request(),{...environment,OWNER_EMAIL:''})).status,503);
 assert.equal((await createWorker(async()=>false).fetch(request(),environment)).status,403);
 const x=await createWorker(async()=>true).fetch(request(),environment);assert.equal(x.status,200);assert.equal(x.headers.get('cache-control'),'private, no-store');assert.equal((await x.json()).items.length,1);
 assert.equal((await createWorker(async()=>true).fetch(request('POST'),environment)).status,404);
});
test('production embeds exact R3 module and route resources',()=>{
 const prod=fs.readFileSync('src/production.js','utf8');for(const file of ['index.html','styles.css','app.js','briefings.js'])assert.ok(prod.includes(JSON.stringify(fs.readFileSync('public/'+file,'utf8'))),file);
 assert.match(fs.readFileSync('public/index.html','utf8'),/id="view-project"/);
 assert.match(fs.readFileSync('public/app.js','utf8'),/\/api\/signals/);
});
