// Deterministic owner-only portfolio summaries. Inputs come from authenticated RLS reads.
// Explicitly mark paginated datasets as partial; never infer missing verification.
const activeStates=new Set(['active','planned','inbox','waiting','paused']);
const statuses=['inbox','planned','active','waiting','paused','completed','archived'];
const isDay=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)
 &&!Number.isNaN(Date.parse(value+'T00:00:00Z'))
 &&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
export function berlinDay(date=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  .filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
}
export function mondayOf(day){
 if(!isDay(day))throw Error('Invalid review day');
 const d=new Date(day+'T00:00:00Z');
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 return d.toISOString().slice(0,10);
}
export function summarizePortfolio({projects=[],phases=[],milestones=[],focus=[],reviews=[],events=[],partial=false},today){
 if(!isDay(today))throw Error('An explicit calendar date is required');
 for(const input of [projects,phases,milestones,focus,reviews,events])
  if(!Array.isArray(input))throw Error('Invalid portfolio dataset');
 const byState=Object.fromEntries(statuses.map(s=>[s,0]));
 const byPriority={P0:0,P1:0,P2:0,P3:0,unassigned:0};
 let overdue=0,approaching=0,actionMissing=0,blocked=0,hardDeadlines=0;
 const days=(date)=>Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
 for(const project of projects){
  if(statuses.includes(project.lifecycle))byState[project.lifecycle]++;
  if(project.priority in byPriority)byPriority[project.priority]++;else byPriority.unassigned++;
  if(!activeStates.has(project.lifecycle))continue;
  if(project.lifecycle==='waiting'||project.lifecycle==='paused')blocked++;
  if(!project.next_action?.trim())actionMissing++;
  if(isDay(project.deadline_date)){
   const remain=days(project.deadline_date);
   if(remain<0)overdue++;
   else if(remain<=7)approaching++;
   if(project.deadline_kind==='hard')hardDeadlines++;
  }
 }
 const blockedPhaseProjects=new Set(phases.filter(p=>p.state==='blocked').map(p=>p.project_id));
 const reported=milestones.filter(m=>m.evidence_grade==='user_reported').length;
 const verified=milestones.filter(m=>m.evidence_grade==='verified'
  &&m.verified_by&&m.verified_at&&(m.release_gate==='none'||m.gate_passed===true)).length;
 const fullWeek=mondayOf(today);
 const currentFocus=new Set(focus.filter(f=>f.week_start===fullWeek).flatMap(f=>f.focus_items||[])
  .map(f=>f.project_id));
 const submitted=new Set(reviews.filter(r=>r.state==='submitted').map(r=>r.week_start));
 return {asOf:today,week:fullWeek,partial:!!partial,
  projects:{total:projects.length,byState,byPriority,overdue,approaching,hardDeadlines,
   missingNextAction:actionMissing,blockedLifecycle:blocked,blockedPhaseProjects:blockedPhaseProjects.size},
  milestones:{total:milestones.length,reported,verified,
   unverified:milestones.length-verified},
  focus:{selected:currentFocus.size,capacity:3},
  reviews:{submittedCount:submitted.size,currentWeekSubmitted:submitted.has(fullWeek)},
  evidence:{observed:events.length,latestObservedAt:events
    .map(e=>e.observed_at).filter(Boolean).sort().at(-1)||null},
  methodology:'Authenticated owner records only; milestones count as verified only with explicit source and passed release gates.'
 };
}
export function diagnoseIntegrations({githubAppConfigured=false,webhookConfigured=false,linked=0,events=0,latestEvent=null,at}){
 if(!at||Number.isNaN(Date.parse(at)))throw Error('Current timestamp required');
 const age=latestEvent&&Date.parse(latestEvent)<=Date.parse(at)
  ?Math.round((Date.parse(at)-Date.parse(latestEvent))/3600000):null;
 return [
  {id:'github_app',label:'GitHub App reconciliation',status:githubAppConfigured?'configured':'not_configured',
   detail:githubAppConfigured?'Credentials present; API reachability not tested':'App credentials not configured'},
  {id:'webhook',label:'GitHub signed webhook',status:webhookConfigured?'configured':'not_configured',
   detail:webhookConfigured?'Secret present; real delivery not verified':'Webhook secret not configured'},
  {id:'repository_links',label:'Repository associations',status:linked>0?'present':'empty',
   detail:linked+' owner-linked repositories'},
  {id:'evidence',label:'Evidence freshness',status:events===0?'none':age===null?'unknown':age>168?'stale':'recent',
   detail:events+' observed events'+(age===null?'':'; newest '+age+' hour(s) ago')}
 ];
}
