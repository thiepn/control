import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
import {berlinDay,mondayOf} from '@/lib/portfolio-insights.mjs';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const {data,error}=await auth.reader.from('control_weekly_reviews')
 .select('id,week_start,state,version,wins,blockers,next_week,snapshot,updated_at,submitted_at')
 .order('week_start',{ascending:false}).limit(13);
 if(error)return fail(error);
 return json({reviews:data||[],thisWeek:mondayOf(berlinDay())});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let input:any;try{input=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 const week=input?.week_start,expected=input?.version,action=input?.action;
 const notes=['wins','blockers','next_week'].map(k=>input?.[k]);
 if(typeof week!=='string'||!/^\d{4}-\d\d-\d\d$/.test(week)
  ||week!==mondayOf(week)||!Number.isSafeInteger(expected)||expected<0
  ||!['draft','submit'].includes(action)
  ||notes.some(x=>typeof x!=='string'||x.length>2000))
  return json({error:'Invalid review data'},400);
 const {data,error}=await auth.writer.rpc('control_save_weekly_review',{
   p_owner:auth.ownerId,p_week:week,p_expected_version:expected,p_action:action,
   p_wins:notes[0],p_blockers:notes[1],p_next_week:notes[2]
 });
 if(error)return fail(error);return json({result:data});
}
