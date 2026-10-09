import {requireOwner,json,fail,sameOrigin} from '@/lib/http';
const validId=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const [targets,phases,focus]=await Promise.all([
  auth.reader.from('project_targets').select('id,project_id,name,definition_of_done,is_current,state,milestones(id,title,weight,completion_fraction,evidence_grade,release_gate,gate_passed,verified_at,verified_by)').eq('is_current',true).limit(500),
  auth.reader.from('development_phases').select('id,project_id,phase_key,title,state,review_needed,notes,head_sha').order('phase_key').limit(1000),
  auth.reader.from('focus_plans').select('week_start,focus_items(project_id,slot,objective)').order('week_start',{ascending:false}).limit(2)
 ]);
 if(targets.error||phases.error||focus.error)return fail(targets.error||phases.error||focus.error);
 return json({targets:targets.data||[],phases:phases.data||[],focus:focus.data||[]});
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Forbidden origin'},403);
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 let input:any;try{input=await req.json();}catch{return json({error:'Invalid JSON'},400);}
 if(!input||!validId(input.project_id)||!['target.create','milestone.create','milestone.report','phase.set','focus.objective'].includes(input.action)
 ||!input.payload||typeof input.payload!=='object'||Array.isArray(input.payload))
  return json({error:'Invalid action'},400);
 const {data,error}=await auth.writer.rpc('control_progress_action',{
  p_owner:auth.ownerId,p_project:input.project_id,p_action:input.action,p_payload:input.payload
 });
 if(error)return fail(error);return json({result:data},201);
}
