import {requireOwner,sameOrigin,json,fail} from '@/lib/http';
import {installationToken} from '@/lib/github-app.mjs';
import {discoverGithubPage,parseDiscoveryQuery} from '@/lib/github-discovery.mjs';
import {githubPrivateAccessAllowed} from '@/lib/github-authorization.mjs';
export const runtime='nodejs';

async function scope(body:any){
 const input=parseDiscoveryQuery(body);
 return discoverGithubPage(input,{installationToken});
}
export async function GET(req:Request){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 try{const p=new URL(req.url).searchParams;
  const input=parseDiscoveryQuery({owner:p.get('owner'),source:p.get('source')||'public',page:p.get('page')||1});
  if(input.source==='installation'&&!githubPrivateAccessAllowed(auth.ownerId))
   return json({error:'GitHub App not authorized for this Control account'},403);
  return json(await scope(input));
 }catch(e){return json({error:e instanceof Error?e.message:'Discovery failed'},400);}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let body:any;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 const ids=body?.ids;
 if(!Array.isArray(ids)||ids.length<1||ids.length>100||
    ids.some(x=>!Number.isSafeInteger(x)||x<=0)||new Set(ids).size!==ids.length)
    return json({error:'Select 1–100 distinct repository IDs'},400);
 let page;
 try{
  const input=parseDiscoveryQuery(body);
  if(input.source==='installation'&&!githubPrivateAccessAllowed(auth.ownerId))
    return json({error:'GitHub App not authorized for this Control account'},403);
  page=await scope(input);
 }catch(e){
  return json({error:e instanceof Error?e.message:'Discovery failed'},400);
 }
 // Never trust a browser-supplied repository name or ID association. Re-query GitHub now.
 const found=new Map(page.items.map(item=>[item.id,item]));
 if(ids.some(id=>!found.has(id)))return json({error:'Discovery results changed; refresh before importing'},409);
 const rows=ids.map(id=>({full_name:found.get(id)!.full_name,github_repository_id:id}));
 const {error}=await auth.writer.rpc('control_intake_candidates',{p_owner:auth.ownerId,p_rows:rows});
 if(error)return fail(error);
 return json({submitted:rows.length,review_required:true},201);
}
