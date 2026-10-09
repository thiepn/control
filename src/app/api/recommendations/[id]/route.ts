import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {id}=await params;
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))
  return json({error:'Invalid recommendation ID'},400);
 let value:any;try{value=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 if(!['accepted','rejected'].includes(value?.decision))return json({error:'Invalid decision'},400);
 const {data,error}=await auth.writer.rpc('control_p4_decide',{
  p_owner:auth.ownerId,p_recommendation:id,p_decision:value.decision
 });
 if(error)return fail(error);
 return json({result:data});
}
