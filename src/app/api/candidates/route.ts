import { requireOwner,json,fail,sameOrigin } from '@/lib/http';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {data,error}=await auth.reader.from('repository_candidates').select('id,full_name,github_repository_id,review_status,review_note').order('full_name').limit(250);
 if(error)return fail(error);return json({items:data||[]});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let rows;try{rows=(await req.json()).items;}catch{return json({error:'Invalid JSON'},400);}
 if(!Array.isArray(rows)||rows.length>250||rows.some(x=>!x||typeof x!=='object'||typeof x.full_name!=='string'||!/^[-\w.]+\/[-\w.]+$/.test(x.full_name)||!Number.isSafeInteger(x.github_repository_id)||x.github_repository_id<=0))return json({error:'Invalid candidates'},400);
 const {data,error}=await auth.writer.rpc('control_intake_candidates',{p_owner:auth.ownerId,p_rows:rows.map(x=>({full_name:x.full_name,github_repository_id:x.github_repository_id}))});
 if(error)return fail(error);return json({count:data});
}
