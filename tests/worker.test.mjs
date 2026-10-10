import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createWorker,verifyAccess} from '../src/worker.js';
const crypto=webcrypto;
const origin='https://control.thiepn.dev';
function store(){
 const rows=new Map();
 const DB={
  prepare(sql){
   let args=[];
   return {bind(...x){args=x;return this;},async all(){return {results:[...rows.values()]};},
    async first(){return rows.get(args[0])||null;},
    async run(){
     if(sql.startsWith('INSERT')){
      const importing=sql.includes('OR IGNORE');
      const [id,title]=args;
      const repo=importing?args[3]:args[6];
      if(repo&&[...rows.values()].some(r=>r.repo_url===repo)){
       if(importing)return {meta:{changes:0}};
       throw Error('UNIQUE constraint failed: projects.repo_url');
      }
      rows.set(id,importing?{id,title,status:'planned',priority:null,progress:null,next_action:null,repo_url:repo,notes:null,version:1,updated_at:'2026-10-10'}:
       {id,title,priority:args[2],progress:args[3],status:args[4],next_action:args[5],repo_url:args[6],notes:args[7],version:1,updated_at:'2026-10-10'});
      return {meta:{changes:1}};
     }
     if(sql.startsWith('UPDATE')){
      const id=args.at(-2),version=args.at(-1),old=rows.get(id);
      if(!old||old.version!==version)return {meta:{changes:0}};
      const columns=sql.split(' SET ')[1].split(',version=')[0].split(',').map(x=>x.split('=')[0]);
      const values=args.slice(0,-2),data={...old,version:old.version+1};
      columns.forEach((field,i)=>data[field]=values[i]);
      if(data.repo_url&&[...rows.values()].some(r=>r.id!==id&&r.repo_url===data.repo_url))throw Error('UNIQUE constraint failed: projects.repo_url');
      rows.set(id,data);return {meta:{changes:1}};
     }
     if(sql.startsWith('DELETE')){
      const [id,version]=args,old=rows.get(id);
      if(!old||old.version!==version)return {meta:{changes:0}};
      rows.delete(id);return {meta:{changes:1}};
     }
     throw Error('Unexpected D1 SQL: '+sql);
    }};
  },
  async batch(statements){return Promise.all(statements.map(s=>s.run()));}
 };
 return {DB,rows};
}
function env(){
 const s=store();
 return {...s,ASSETS:{fetch:async()=>new Response('<h1>Private</h1>',{headers:{'Content-Type':'text/html'}})},
 ACCESS_TEAM_DOMAIN:'https://personal.cloudflareaccess.com',ACCESS_AUD:'control-test-aud',OWNER_EMAIL:'owner@example.com'};
}
function req(path,method='GET',data,headers={}){
 return new Request(origin+path,{method,headers:{...(method!=='GET'?{'Origin':origin,'Content-Type':'application/json'}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
}
const app=createWorker(async()=>true);
test('fail closed before assets and D1 when Access not configured or signed',async()=>{
 const environment=env();
 assert.equal((await createWorker().fetch(req('/'),environment)).status,403);
 assert.equal((await createWorker().fetch(req('/api/projects'),environment)).status,403);
 assert.equal((await app.fetch(req('/'),{...environment,OWNER_EMAIL:''})).status,503);
 assert.equal(environment.rows.size,0);
});
test('private static assets returned only after auth, with noncache and CSP',async()=>{
 const r=await app.fetch(req('/'),env());
 assert.equal(r.status,200);assert.match(await r.text(),/Private/);
 assert.match(r.headers.get('content-security-policy'),/default-src 'self'/);
 assert.equal(r.headers.get('cache-control'),'private, no-store');
});
test('D1-backed create, list, revision-safe edit and delete',async()=>{
 const e=env();
 const initial=await app.fetch(req('/api/projects','POST',{title:' StudyOS ',priority:'P0',progress:65,status:'active',next_action:'Test next release',repo_url:'https://github.com/thiepn/studyOS'}),e);
 assert.equal(initial.status,201);const p=(await initial.json()).item;assert.equal(p.title,'StudyOS');
 assert.equal(e.rows.size,1);
 const listed=await app.fetch(req('/api/projects'),e);
 assert.equal((await listed.json()).items[0].progress,65);
 const edit=await app.fetch(req('/api/projects/'+p.id,'PATCH',{version:1,progress:70,priority:'P1'}),e);
 assert.equal(edit.status,200);assert.equal((await edit.json()).item.version,2);
 assert.equal((await app.fetch(req('/api/projects/'+p.id,'PATCH',{version:1,progress:99}),e)).status,409);
 assert.equal((await app.fetch(req('/api/projects/'+p.id,'DELETE',{version:1}),e)).status,409);
 assert.equal((await app.fetch(req('/api/projects/'+p.id,'DELETE',{version:2}),e)).status,200);
 assert.equal(e.rows.size,0);
});
test('no invalid completion, unsafe repo URLs, oversized fields or forged origins',async()=>{
 const e=env();
 const base={title:'Safe',status:'planned'};
 for(const progress of [-1,101,1.5,'85']){
  const r=await app.fetch(req('/api/projects','POST',{...base,progress}),e);
  assert.equal(r.status,400,progress);
 }
 for(const repo_url of ['https://evil.test/owner/repo','javascript:alert(1)','http://github.com/a/b','https://github.com/a/b?x=1']){
  assert.equal((await app.fetch(req('/api/projects','POST',{...base,repo_url}),e)).status,400);
 }
 assert.equal((await app.fetch(req('/api/projects','POST',{title:'x'.repeat(101)}),e)).status,400);
 assert.equal((await app.fetch(req('/api/projects','POST',base,{'Origin':'https://evil.test','sec-fetch-site':'cross-site'}),e)).status,403);
 assert.equal(e.rows.size,0);
});
test('bulk import creates unassessed projects once, and backup matches persisted data',async()=>{
 const e=env();
 const first=await app.fetch(req('/api/import','POST',{names:['thiepn/gomoku','thiepn/studyOS','thiepn/gomoku']}),e);
 assert.equal(first.status,201);assert.deepEqual(await first.json(),{imported:2,submitted:2});
 const second=await app.fetch(req('/api/import','POST',{names:['thiepn/gomoku']}),e);
 assert.equal((await second.json()).imported,0);
 const backup=await app.fetch(req('/api/backup'),e);
 const data=await backup.json();
 assert.equal(data.format,'thiepn-control-v1');assert.equal(data.items.length,2);
 assert.ok(data.items.every(p=>p.progress===null&&p.priority===null));
 assert.match(backup.headers.get('content-disposition'),/attachment/);
 assert.equal((await app.fetch(req('/api/import','POST',{names:['../bad']}),e)).status,400);
});
test('Cloudflare Access signature, audience, owner and expiry actually verified',async()=>{
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const publicKey=await crypto.subtle.exportKey('jwk',keys.publicKey);
 const enc=v=>btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(v)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const fromBytes=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const now=Math.floor(Date.now()/1000),e=env();
 const fetcher=async()=>Response.json({keys:[{...publicKey,kid:'test-key'}]});
 async function token(claims={}){
  const h=enc({alg:'RS256',kid:'test-key'}),payload=enc({iss:e.ACCESS_TEAM_DOMAIN,aud:e.ACCESS_AUD,email:e.OWNER_EMAIL,exp:now+600,...claims});
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(h+'.'+payload));
  return h+'.'+payload+'.'+fromBytes(signature);
 }
 const valid=await token();
 assert.equal(await verifyAccess(req('/', 'GET',undefined,{'cf-access-jwt-assertion':valid}),e,fetcher),true);
 const badPayload=valid.split('.');badPayload[1]=enc({iss:e.ACCESS_TEAM_DOMAIN,aud:e.ACCESS_AUD,email:e.OWNER_EMAIL,exp:now+999});
 assert.equal(await verifyAccess(req('/','GET',undefined,{'cf-access-jwt-assertion':badPayload.join('.')}),e,fetcher),false);
 for(const claims of [{aud:'different'},{email:'attacker@example.com'},{exp:now-10},{iss:'https://evil.test'},{nbf:now+600}]){
  assert.equal(await verifyAccess(req('/','GET',undefined,{'cf-access-jwt-assertion':await token(claims)}),e,fetcher),false,JSON.stringify(claims));
 }
});
