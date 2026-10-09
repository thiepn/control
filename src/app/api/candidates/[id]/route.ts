import { requireOwner,json,fail,sameOrigin } from '@/lib/http';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))return json({error:'Invalid ID'},400);
 let action,projectId;try{({action,projectId}=await req.json());}catch{return json({error:'Invalid JSON'},400);}
 if(!['dismiss','link'].includes(action)||(action==='link' && (typeof projectId!=='string'||!/^[a-f0-9-]{36}$/i.test(projectId))))return json({error:'Invalid review'},400);
 const {data,error}=await auth.writer.rpc('control_review_candidate',{p_owner:auth.ownerId,p_candidate:id,p_action:action,p_project:projectId||null});
 if(error)return fail(error);return json({item:data});
}
