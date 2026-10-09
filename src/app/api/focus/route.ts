import { requireOwner,json,fail,sameOrigin } from '@/lib/http';
import { assertFocus,weekStart } from '@/lib/rules.mjs';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const week=weekStart(); const {data,error}=await auth.reader.from('focus_plans').select('id,focus_items(slot,project_id,objective)').eq('week_start',week).maybeSingle();
 if(error)return fail(error);return json({week,items:data?.focus_items||[]});
}
export async function PUT(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let ids:string[];try{ids=assertFocus((await req.json()).project_ids);}catch{return json({error:'Choose at most three distinct projects'},400);}
 const {data,error}=await auth.writer.rpc('control_replace_focus',{p_owner:auth.ownerId,p_week:weekStart(),p_projects:ids});
 if(error)return fail(error);return json({items:data});
}
