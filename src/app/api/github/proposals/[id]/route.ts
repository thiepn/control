import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))return json({error:'Invalid ID'},400);
 let data;try{data=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 if(!['accepted','rejected'].includes(data?.decision))return json({error:'Invalid decision'},400);
 const {data:result,error}=await auth.writer.rpc('control_decide_github_proposal',{
   p_owner:auth.ownerId,p_proposal:id,p_decision:data.decision
 });
 if(error)return fail(error);
 return json({result});
}
