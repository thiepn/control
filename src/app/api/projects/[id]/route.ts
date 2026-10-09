import { requireOwner, json, fail, sameOrigin } from '@/lib/http';
import { parseProject } from '@/lib/rules.mjs';
export async function PATCH(req: Request,{params}:{params:Promise<{id:string}>}) {
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/i.test(id))return json({error:'Invalid project ID'},400);
 const ver=req.headers.get('if-match');if(!ver||!/^\d+$/.test(ver))return json({error:'If-Match version required'},428);
 try {const payload=parseProject(await req.json()); if(Object.keys(payload).length===0)return json({error:'Empty update'},400);
  const {data,error}=await auth.writer.rpc('control_mutate_project',{p_owner:auth.ownerId,p_action:'update',p_id:id,p_payload:payload,p_version:Number(ver)});
  if(error)return fail(error);return json({item:data});
 } catch{return json({error:'Invalid project update'},400);}
}
export async function DELETE(req: Request,{params}:{params:Promise<{id:string}>}) {
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {id}=await params;const ver=req.headers.get('if-match');
 if(!/^[a-f0-9-]{36}$/i.test(id)||!ver||!/^\d+$/.test(ver))return json({error:'ID and If-Match required'},400);
 const {data,error}=await auth.writer.rpc('control_mutate_project',{p_owner:auth.ownerId,p_action:'archive',p_id:id,p_payload:{},p_version:Number(ver)});
 if(error)return fail(error);return json({item:data});
}
