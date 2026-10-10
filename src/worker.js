// One private Worker. Cloudflare Access is verified before static assets OR D1.
const statuses=['planned','active','paused','completed'];
const priorities=['P0','P1','P2','P3'];
const baseHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const repoRegex=/^[\w.-]{1,39}\/[\w.-]{1,100}$/;
const json=(obj,status=200,headers={})=>Response.json(obj,{status,headers:{...baseHeaders,...headers}});
function parse64(value){const b=value.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(b.padEnd(Math.ceil(b.length/4)*4,'=')),c=>c.charCodeAt(0));}
function data64(value){return JSON.parse(new TextDecoder().decode(parse64(value)));}
function config(env){
 if(!env?.DB||!env?.ASSETS||!env?.ACCESS_TEAM_DOMAIN||!env?.ACCESS_AUD||!env?.OWNER_EMAIL)return null;
 let url;
 try{url=new URL(env.ACCESS_TEAM_DOMAIN);}catch{return null;}
 if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||!url.hostname.endsWith('.cloudflareaccess.com'))return null;
 const email=env.OWNER_EMAIL.trim().toLowerCase();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return null;
 return {team:url.origin,aud:env.ACCESS_AUD,email};
}
export async function verifyAccess(request,env,fetcher=fetch){
 const c=config(env);if(!c)return false;
 const token=request.headers.get('cf-access-jwt-assertion');
 if(!token||token.length>8192)return false;
 const parts=token.split('.');if(parts.length!==3)return false;
 try{
  const header=data64(parts[0]),claims=data64(parts[1]);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>300)return false;
  const now=Math.floor(Date.now()/1000);
  if(claims.iss!==c.team||!(typeof claims.aud==='string'?claims.aud===c.aud:Array.isArray(claims.aud)&&claims.aud.includes(c.aud)))return false;
  if(typeof claims.exp!=='number'||claims.exp<=now||(typeof claims.nbf==='number'&&claims.nbf>now))return false;
  if(typeof claims.email!=='string'||claims.email.trim().toLowerCase()!==c.email)return false;
  const r=await fetcher(c.team+'/cdn-cgi/access/certs');
  if(!r.ok)return false;
  const certs=await r.json();
  const k=certs.keys?.find(x=>x.kid===header.kid&&x.kty==='RSA'&&x.n&&x.e);
  if(!k)return false;
  const key=await crypto.subtle.importKey('jwk',{kty:'RSA',n:k.n,e:k.e,alg:'RS256',ext:true},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,parse64(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 }catch{return false;}
}
function sameOrigin(request){
 const origin=request.headers.get('origin');
 try{return origin===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site';}catch{return false;}
}
async function readJSON(request){
 if(Number(request.headers.get('content-length')||0)>90000)throw Error('Payload too large');
 const raw=await request.text();if(raw.length>90000)throw Error('Payload too large');
 try{return JSON.parse(raw);}catch{throw Error('Invalid JSON');}
}
function str(v,max,nullable=true){
 if(v==null&&nullable)return null;
 if(typeof v!=='string')throw Error('Invalid field');
 const value=v.trim();if(value.length>max)throw Error('Field too long');
 return value||null;
}
function projectPayload(body,patch=false){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid project');
 const result={};
 const allowed=['title','priority','progress','status','next_action','repo_url','notes'];
 for(const key of Object.keys(body))if(!allowed.includes(key)&&key!=='version')throw Error('Unknown field: '+key);
 if(!patch||Object.hasOwn(body,'title'))result.title=str(body.title,100,false);
 if(!patch&&!result.title)throw Error('Title required');
 if(Object.hasOwn(body,'title')&&!result.title)throw Error('Title required');
 if(!patch||Object.hasOwn(body,'priority')){
  if(body.priority!=null&&body.priority!==''&&!priorities.includes(body.priority))throw Error('Invalid priority');
  result.priority=body.priority||null;
 }
 if(!patch||Object.hasOwn(body,'progress')){
  if(body.progress==null||body.progress==='')result.progress=null;
  else if(!Number.isInteger(body.progress)||body.progress<0||body.progress>100)throw Error('Progress must be 0–100');
  else result.progress=body.progress;
 }
 if(!patch||Object.hasOwn(body,'status')){
  if(body.status!=null&&!statuses.includes(body.status))throw Error('Invalid status');
  result.status=body.status||'planned';
 }
 if(!patch||Object.hasOwn(body,'next_action'))result.next_action=str(body.next_action,500);
 if(!patch||Object.hasOwn(body,'notes'))result.notes=str(body.notes,2000);
 if(!patch||Object.hasOwn(body,'repo_url')){
  const value=str(body.repo_url,240);
  if(value){
   let url;try{url=new URL(value);}catch{throw Error('Invalid GitHub link');}
   if(url.protocol!=='https:'||url.hostname!=='github.com'||!/^\/[\w.-]+\/[\w.-]+\/?$/.test(url.pathname)||url.search||url.hash)throw Error('Only GitHub repository links are accepted');
   result.repo_url='https://github.com'+url.pathname.replace(/\/$/,'');
  }else result.repo_url=null;
 }
 return result;
}
export function createWorker(auth=verifyAccess){
 return {async fetch(request,env){
  // Never expose even the HTML without a correctly configured Access verifier.
  if(!config(env))return json({error:'Owner protection is not configured'},503);
  if(!await auth(request,env))return json({error:'Access denied'},403);
  const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();
  if(!path.startsWith('/api/')){
   if(method!=='GET'&&method!=='HEAD')return json({error:'Method not allowed'},405);
   const asset=await env.ASSETS.fetch(request);
   const h=new Headers(asset.headers);
   for(const [k,v] of Object.entries(baseHeaders))h.set(k,v);
   h.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
   return new Response(asset.body,{status:asset.status,headers:h});
  }
  if(!['GET','POST','PATCH','DELETE'].includes(method))return json({error:'Method not allowed'},405);
  if(method!=='GET'&&!sameOrigin(request))return json({error:'Invalid origin'},403);
  try{
   if(path==='/api/reviews'&&method==='GET'){
    const rows=await env.DB.prepare('SELECT * FROM project_reviews ORDER BY assessed_at DESC, repo_url LIMIT 2000').all();
    return json({items:rows.results||[]});
   }
   if(path==='/api/signals'&&method==='GET'){
    const rows=await env.DB.prepare('SELECT repo_url,signal_key,kind,dimension,state,label,detail,evidence_url,checked_at FROM project_signals ORDER BY repo_url,kind,dimension,signal_key LIMIT 2000').all();
    return json({items:rows.results||[]});
   }
   if(path==='/api/projects'&&method==='GET'){
    const rows=await env.DB.prepare('SELECT * FROM projects ORDER BY updated_at DESC, id DESC LIMIT 2000').all();
    return json({items:rows.results||[]});
   }
   if(path==='/api/projects'&&method==='POST'){
    const p=projectPayload(await readJSON(request));
    const item={id:crypto.randomUUID(),...p,version:1};
    await env.DB.prepare('INSERT INTO projects (id,title,priority,progress,status,next_action,repo_url,notes,version) VALUES (?,?,?,?,?,?,?,?,?)')
     .bind(item.id,p.title,p.priority,p.progress,p.status,p.next_action,p.repo_url,p.notes,1).run();
    return json({item},201);
   }
   if(path==='/api/import'&&method==='POST'){
    const body=await readJSON(request),names=body?.names;
    if(!Array.isArray(names)||names.length<1||names.length>100||names.some(x=>typeof x!=='string'||!repoRegex.test(x)||x.includes('..')))throw Error('Provide 1–100 valid owner/repository names');
    const unique=[...new Set(names)];
    const statements=unique.map(name=>env.DB.prepare('INSERT OR IGNORE INTO projects (id,title,status,repo_url,version) VALUES (?,? ,?, ?,1)')
     .bind(crypto.randomUUID(),name.split('/')[1],'planned','https://github.com/'+name));
    const result=await env.DB.batch(statements);
    return json({imported:result.reduce((n,r)=>n+(r.meta?.changes||0),0),submitted:unique.length},201);
   }
   if(path==='/api/backup'&&method==='GET'){
    const rows=await env.DB.prepare('SELECT * FROM projects ORDER BY title COLLATE NOCASE LIMIT 2000').all();
    return json({format:'thiepn-control-v1',exported_at:new Date().toISOString(),items:rows.results||[]},200,{'Content-Disposition':'attachment; filename="control-projects.json"'});
   }
   const match=/^\/api\/projects\/([0-9a-f-]{36})$/.exec(path);
   if(match&&uuid.test(match[1])&&(method==='PATCH'||method==='DELETE')){
    const body=await readJSON(request);
    if(!Number.isInteger(body?.version)||body.version<1)throw Error('Version is required');
    const id=match[1],version=body.version;
    if(method==='DELETE'){
     const result=await env.DB.prepare('DELETE FROM projects WHERE id=? AND version=?').bind(id,version).run();
     return result.meta?.changes?json({deleted:true}):json({error:'Record changed or missing. Refresh.'},409);
    }
    const data=projectPayload(body,true),fields=Object.keys(data);
    if(!fields.length)throw Error('No fields to update');
    const values=fields.map(key=>data[key]);
    const sql='UPDATE projects SET '+fields.map(f=>f+'=?').join(',')+',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?';
    const result=await env.DB.prepare(sql).bind(...values,id,version).run();
    if(!result.meta?.changes)return json({error:'Record changed or missing. Refresh.'},409);
    const item=await env.DB.prepare('SELECT * FROM projects WHERE id=?').bind(id).first();
    return json({item});
   }
   return json({error:'Not found'},404);
  }catch(e){
   const msg=e instanceof Error?e.message:'Operation failed';
   if(/UNIQUE constraint failed/i.test(msg))return json({error:'This repository link already exists'},409);
   if(/^(Invalid|Unknown|Title|required|Field|Only GitHub|Progress|No fields|Provide|Payload|Version)/.test(msg))return json({error:msg},400);
   return json({error:'Database operation failed'},500);
  }
 }};
}
export default createWorker();
