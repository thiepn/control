import {requireOwner,json,fail} from '@/lib/http';
import {summarizePortfolio,berlinDay,diagnoseIntegrations} from '@/lib/portfolio-insights.mjs';
export const runtime='nodejs';
export async function GET(){
 const auth=await requireOwner();if(!auth)return json({error:'Unauthorized'},401);
 const [p,ph,t,f,r,e,l]=await Promise.all([
  auth.reader.from('projects').select('id,lifecycle,priority,deadline_date,deadline_kind,next_action').limit(501),
  auth.reader.from('development_phases').select('project_id,state').limit(1001),
  auth.reader.from('project_targets').select('id,milestones(evidence_grade,verified_by,verified_at,release_gate,gate_passed)').eq('is_current',true).limit(501),
  auth.reader.from('focus_plans').select('week_start,focus_items(project_id)').order('week_start',{ascending:false}).limit(3),
  auth.reader.from('control_weekly_reviews').select('week_start,state').order('week_start',{ascending:false}).limit(14),
  auth.reader.from('evidence_events').select('observed_at').order('observed_at',{ascending:false}).limit(101),
  auth.reader.from('project_repository_links').select('id').limit(501)
 ]);
 const problem=p.error||ph.error||t.error||f.error||r.error||e.error||l.error;
 if(problem)return fail(problem);
 const targets=(t.data||[]) as {milestones?:unknown[]}[];
 const milestones=targets.flatMap(v=>v.milestones||[]);
 const partial=(p.data?.length||0)>500||(ph.data?.length||0)>1000
   ||(t.data?.length||0)>500||(e.data?.length||0)>100||(l.data?.length||0)>500
   ||(r.data?.length||0)>13;
 const now=new Date();
 const summary=summarizePortfolio({
  projects:(p.data||[]).slice(0,500),phases:(ph.data||[]).slice(0,1000),
  milestones,focus:f.data||[],reviews:r.data||[],
  events:e.data||[],partial
 },berlinDay(now));
 const integrations=diagnoseIntegrations({
  githubAppConfigured:!!(process.env.GITHUB_APP_ID&&process.env.GITHUB_APP_INSTALLATION_ID&&process.env.GITHUB_APP_PRIVATE_KEY),
  webhookConfigured:!!process.env.GITHUB_WEBHOOK_SECRET,
  linked:l.data?.length||0,events:e.data?.length||0,latestEvent:e.data?.[0]?.observed_at||null,
  at:now.toISOString()
 });
 return json({summary,integrations,readAt:now.toISOString(),datasetPartial:partial});
}
