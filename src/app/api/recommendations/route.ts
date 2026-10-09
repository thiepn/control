import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
import {prioritySnapshot,recommendationFingerprint} from '@/lib/p4-server';
export const runtime='nodejs';
export async function GET(req:Request){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const params=new URL(req.url).searchParams;
 const capacity=Number(params.get('capacity')||3);
 if(!Number.isInteger(capacity)||capacity<1||capacity>3)return json({error:'Capacity must be 1–3'},400);
 try{return json(await prioritySnapshot(auth,capacity));}
 catch(e){return fail(e);}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let body:any;try{body=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 const {project_id,kind}=body||{},capacity=body?.capacity??3;
 if(typeof project_id!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(project_id)
  ||!['priority','focus','blocker'].includes(kind)||!Number.isInteger(capacity)||capacity<1||capacity>3)
  return json({error:'Invalid recommendation request'},400);
 try{
  const snapshot=await prioritySnapshot(auth,capacity);
  const row=snapshot.ranked.find((r:{id:string})=>r.id===project_id);
  if(!row)return json({error:'Project not eligible'},409);
  const eligible=kind==='priority'?row.priorityChange
     :kind==='focus'?snapshot.focusSuggestions.some((r:{id:string})=>r.id===project_id)
     :row.blocked;
  if(!eligible)return json({error:'Recommendation is no longer applicable'},409);
  const proposed=kind==='priority'?{priority:row.suggestedPriority}
   :kind==='focus'?{week:snapshot.week,capacity}
   :{acknowledge_only:true};
  const details={engine:row.source,factors:row.factors,confidence:row.confidence,
    current_priority:row.currentPriority,blocked:row.blocked,computed_day:snapshot.today};
  const fingerprint=recommendationFingerprint(row,kind,snapshot.week,capacity,snapshot.focusIds);
  const {data,error}=await auth.writer.rpc('control_p4_prepare',{
    p_owner:auth.ownerId,p_project:project_id,p_kind:kind,p_fingerprint:fingerprint,
    p_version:row.version,p_score:row.score,p_details:details,p_proposed:proposed
  });
  if(error)return fail(error);
  return json({id:data,queued:true},201);
 }catch(e){return fail(e);}
}
