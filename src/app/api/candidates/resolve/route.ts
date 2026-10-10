import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
import {installationToken} from '@/lib/github-app.mjs';
import {parseRepositoryName} from '@/lib/repo-name.mjs';

// Fixed GitHub API host, owner authenticated, same-origin POST. No user-provided URL is fetched.
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let input:any;try{input=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 const name=parseRepositoryName(input?.repository);
 if(!name)return json({error:'Use owner/repo or a github.com repository URL'},400);
 const headers:Record<string,string>={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 if(process.env.GITHUB_APP_ID||process.env.GITHUB_APP_INSTALLATION_ID||process.env.GITHUB_APP_PRIVATE_KEY){
  try{headers.Authorization='Bearer '+await installationToken();}
  catch{return json({error:'GitHub App configuration incomplete or unavailable'},503);}
 }
 let result:Response;
 try{
  result=await fetch('https://api.github.com/repos/'+name.split('/').map(encodeURIComponent).join('/'),{
    headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)
  });
 }catch{return json({error:'GitHub repository lookup unavailable'},503);}
 if(!result.ok)return json({error:result.status===404?'Repository not found or not authorized':'GitHub repository lookup failed'},result.status===404?404:503);
 let repo:any;try{repo=await result.json();}catch{return json({error:'Invalid GitHub response'},503);}
 if(!repo||typeof repo.full_name!=='string'||parseRepositoryName(repo.full_name)?.toLowerCase()!==name.toLowerCase()
   ||!Number.isSafeInteger(repo.id)||repo.id<=0)return json({error:'GitHub repository identity mismatch'},502);
 const {data,error}=await auth.writer.rpc('control_intake_candidates',{
   p_owner:auth.ownerId,p_rows:[{full_name:repo.full_name,github_repository_id:repo.id}]
 });
 if(error)return fail(error);
 return json({count:data},201);
}
