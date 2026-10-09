import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
import {validateDeviceReceipt} from '@/lib/p7-release.mjs';
export const runtime='nodejs';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {data,error}=await auth.reader.from('control_device_observations')
  .select('id,surface,source_sha,evidence_sha256,observation,classification,recorded_at')
  .order('recorded_at',{ascending:false}).limit(50);
 if(error)return fail(error);
 return json({items:data||[],note:'User-entered digest receipts are unverified and never grant release approval.'});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 if(Number(req.headers.get('content-length')||0)>2048)return json({error:'Request too large'},413);
 let input:unknown;try{input=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 let item;
 try{item=validateDeviceReceipt(input);}catch{return json({error:'Invalid observation metadata'},400);}
 const {data,error}=await auth.writer.rpc('control_record_device_observation',{
  p_owner:auth.ownerId,p_surface:item.surface,p_source_sha:item.source_sha,
  p_evidence_sha256:item.evidence_sha256,p_observation:item.observation
 });
 if(error)return fail(error);
 return json({id:data,classification:'self_reported_unverified',acceptedAsApproval:false},201);
}
