import {requireOwner,json,fail} from '@/lib/http';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const [events,proposals]=await Promise.all([
  auth.reader.from('evidence_events').select('id,repository_id,project_id,event_type,event_sha,observed_at,payload').eq('provider','github').order('observed_at',{ascending:false}).limit(100),
  auth.reader.from('ai_proposals').select('id,project_id,proposal_type,rationale,state,proposed_value,created_at').order('created_at',{ascending:false}).limit(100)
 ]);
 if(events.error||proposals.error)return fail(events.error||proposals.error);
 return json({events:events.data||[],proposals:proposals.data||[]});
}
