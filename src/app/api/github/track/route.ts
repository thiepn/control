import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let input:any;try{input=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 if(!input||typeof input.project_id!=='string'||!/^[0-9a-f-]{36}$/i.test(input.project_id)
   ||typeof input.phase_key!=='string'||!/^P[0-9]{1,3}$/.test(input.phase_key)
   ||typeof input.sha!=='string'||!/^[0-9a-f]{40}$/.test(input.sha))
   return json({error:'Invalid head binding'},400);
 const {data,error}=await auth.writer.rpc('control_track_github_head',{
   p_owner:auth.ownerId,p_project:input.project_id,p_phase:input.phase_key,p_sha:input.sha
 });
 if(error)return fail(error);
 return json({result:data});
}
