import {adminClient} from '@/lib/supabase/admin';
import {requireOwner,sameOrigin,json,fail} from '@/lib/http';
import {installationToken,githubRepoUrl} from '@/lib/github-app.mjs';
import {reconcileEvidence} from '@/lib/github-evidence.mjs';
export const runtime='nodejs';
export async function POST(req:Request){
 const cronSecret=process.env.CRON_SECRET;
 const cron=!!cronSecret&&req.headers.get('authorization')==='Bearer '+cronSecret;
 let owner:string|null=null;
 if(!cron){
  if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
  const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
  owner=auth.ownerId;
 }
 const admin=adminClient();
 let q=admin.from('github_repositories').select('id,owner_id,github_repository_id,full_name').limit(50);
 if(owner)q=q.eq('owner_id',owner);
 const {data:repositories,error}=await q;
 if(error)return fail(error);
 let token:string;
 try{token=await installationToken();}catch{return json({error:'GitHub installation not configured'},503);}
 let ingested=0,checked=0;
 for(const repo of repositories||[]){
  const linked=await admin.from('project_repository_links').select('id').eq('owner_id',repo.owner_id).eq('repository_id',repo.id).limit(1);
  if(linked.error)return fail(linked.error);
  if(!linked.data?.length)continue;
  checked++;
  for(const [path,kind] of [['pulls','pull_request'],['actions/runs','workflow_run']] as const){
   let url:string;try{url=githubRepoUrl(repo.full_name,path);}catch{continue;}
   const response=await fetch(url,{headers:{'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},cache:'no-store'});
   if(!response.ok)return json({error:'GitHub reconciliation failed'},502);
   const payload=await response.json();
   const items=path==='pulls'?payload:payload.workflow_runs;
   if(!Array.isArray(items))return json({error:'Unexpected GitHub response'},502);
   for(const item of items.slice(0,25)){
    let e;try{e=reconcileEvidence(repo.github_repository_id,kind,item);}catch{continue;}
    const {data,error:writeError}=await admin.rpc('control_ingest_github_event',{
      p_repository_id:e.repositoryId,p_delivery:e.delivery,p_kind:e.eventType,p_sha:e.sha,p_summary:e.summary
    });
    if(writeError)return fail(writeError);
    ingested+=Number(data||0);
   }
  }
 }
 return json({checked,ingested}); // No repository private data disclosed.
}
