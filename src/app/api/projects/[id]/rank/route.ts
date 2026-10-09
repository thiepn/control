import { requireOwner,json,fail,sameOrigin } from '@/lib/http';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {id}=await params; if(!/^[a-f0-9-]{36}$/i.test(id))return json({error:'Invalid ID'},400);
 let direction;try{direction=(await req.json()).direction;}catch{return json({error:'Invalid JSON'},400);}
 if(![-1,1].includes(direction))return json({error:'Invalid direction'},400);
 const {error}=await auth.writer.rpc('control_move_project',{p_owner:auth.ownerId,p_project:id,p_direction:direction});
 if(error)return fail(error);return json({ok:true});
}
