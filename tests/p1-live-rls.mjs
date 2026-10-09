/** Mandatory qualification: disposable Supabase project, two independently authenticated test users.
 * NEVER run against production. No diagnostic prints contain credentials or private user data.
 */
import { assertOptimisticRace } from './helpers/optimistic-race.mjs';
const env = process.env;
if(env.CONTROL_TEST_DISPOSABLE!=='I_ACKNOWLEDGE_DISPOSABLE_PROJECT') {
 console.error('Not qualified: explicit disposable-project attestation required.');process.exit(2);
}
for(const k of ['CONTROL_TEST_SUPABASE_URL','CONTROL_TEST_SERVICE_KEY','CONTROL_TEST_PUBLISHABLE_KEY','CONTROL_TEST_USER_A_JWT','CONTROL_TEST_USER_B_JWT']) {
 if(!env[k]){console.error(`Not qualified: missing ${k}`);process.exit(2);}
}
const base=env.CONTROL_TEST_SUPABASE_URL.replace(/\/$/,'');
const key=env.CONTROL_TEST_PUBLISHABLE_KEY,service=env.CONTROL_TEST_SERVICE_KEY;
async function req(path,token,method='GET',body){
 const res=await fetch(base+path,{method,headers:{'apikey':token===service?service:key,'Authorization':'Bearer '+token,'Content-Type':'application/json','Prefer':'return=representation'},body:body===undefined?undefined:JSON.stringify(body)});
 let payload;try{payload=await res.json();}catch{payload=null;}
 return {status:res.status,data:payload};
}
function ok(v,msg){if(!v)throw Error('RLS qualification failed: '+msg);}
const a=await req('/auth/v1/user',env.CONTROL_TEST_USER_A_JWT);
const b=await req('/auth/v1/user',env.CONTROL_TEST_USER_B_JWT);
ok(a.status===200&&b.status===200&&a.data?.id!==b.data?.id,'two separate authenticated users required');
const created=[];
try{
 const make=async(user,title)=>{
  const slug='rls-integration-'+user.id.slice(0,8)+'-'+Date.now().toString(36);
  const r=await req('/rest/v1/rpc/control_mutate_project',service,'POST',{p_owner:user.id,p_action:'create',p_id:null,p_payload:{title,slug},p_version:null});
  ok(r.status===200&&r.data?.owner_id===user.id,'transactional create');created.push(r.data);return r.data;
 };
 const pa=await make(a.data,'RLS Test Alpha'),pb=await make(b.data,'RLS Test Beta');
 const qa=await req('/rest/v1/projects?select=id,owner_id',env.CONTROL_TEST_USER_A_JWT);
 const qb=await req('/rest/v1/projects?select=id,owner_id',env.CONTROL_TEST_USER_B_JWT);
 ok(qa.status===200&&qa.data.some(x=>x.id===pa.id)&&!qa.data.some(x=>x.id===pb.id),'user A data isolation');
 ok(qb.status===200&&qb.data.some(x=>x.id===pb.id)&&!qb.data.some(x=>x.id===pa.id),'user B data isolation');
 const anonymous=await req('/rest/v1/projects?select=id',key);
 ok(anonymous.status>=400 || !anonymous.data.some(x=>x.id===pa.id),'anonymous cannot read');
 const forged=await req('/rest/v1/projects',env.CONTROL_TEST_USER_A_JWT,'POST',{id:crypto.randomUUID(),owner_id:b.data.id,title:'Forged',slug:'forged'});
 ok(forged.status>=400,'browser role cannot forge owner write');
 const update=await req('/rest/v1/rpc/control_mutate_project',service,'POST',{p_owner:a.data.id,p_action:'update',p_id:pa.id,p_payload:{next_action:'Validated user update'},p_version:pa.version});
 ok(update.status===200 && update.data.version===pa.version+1,'transactional versioned update');
 const stale=await req('/rest/v1/rpc/control_mutate_project',service,'POST',{p_owner:a.data.id,p_action:'update',p_id:pa.id,p_payload:{title:'Stale overwrite'},p_version:pa.version});
 ok(stale.status>=400,'stale-write conflict');
 // Verify an actual overlapping pair of writes, not just sequential stale-version rejection.
 // Both transactions use the same version, so exactly one may commit.
 const raceVersion=update.data.version;
 const competing=await Promise.all(['Concurrent Alpha','Concurrent Beta'].map(next_action=>
  req('/rest/v1/rpc/control_mutate_project',service,'POST',{
   p_owner:a.data.id,p_action:'update',p_id:pa.id,
   p_payload:{next_action},p_version:raceVersion
  })
 ));
 const winner=assertOptimisticRace(competing,raceVersion);
 const persisted=await req(`/rest/v1/projects?id=eq.${pa.id}&select=id,version,next_action`,env.CONTROL_TEST_USER_A_JWT);
 ok(persisted.status===200 && persisted.data?.length===1 &&
    persisted.data[0].version===winner.version &&
    persisted.data[0].next_action===winner.next_action,
    'concurrent update winner must be the single persisted version');
 const history=await req(`/rest/v1/audit_log?project_id=eq.${pa.id}&select=id,action`,env.CONTROL_TEST_USER_A_JWT);
 ok(history.status===200 && history.data.some(x=>x.action==='project.update'),'audit entry after edit');
 const crossAudit=await req(`/rest/v1/audit_log?project_id=eq.${pa.id}&select=id`,env.CONTROL_TEST_USER_B_JWT);
 ok(crossAudit.status===200 && crossAudit.data.length===0,'audit owner isolation');
 const overFocus=await req('/rest/v1/rpc/control_replace_focus',service,'POST',{p_owner:a.data.id,p_week:'2026-10-05',p_projects:Array.from({length:4},()=>crypto.randomUUID())});
 ok(overFocus.status>=400,'focus cap enforced by SQL');
 console.log('PASS: disposable Supabase two-user RLS, denies, audit, competing concurrent writes, optimistic conflict and focus cap');
} finally {
 for(const p of created){const del=await req(`/rest/v1/projects?id=eq.${p.id}`,service,'DELETE');if(del.status>=400)console.error('Warning: test row cleanup failed');}
}
