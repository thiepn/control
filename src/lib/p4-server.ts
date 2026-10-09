import {createHash} from 'node:crypto';
import {prioritizePortfolio,ENGINE_VERSION} from './prioritization.mjs';
import {weekStart} from './rules.mjs';

export function berlinToday(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
  timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(now).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
export async function prioritySnapshot(auth:NonNullable<Awaited<ReturnType<typeof import('./http').requireOwner>>>,capacity=3){
 if(!Number.isInteger(capacity)||capacity<1||capacity>3)throw Error('Capacity must be 1–3');
 const week=weekStart(),today=berlinToday();
 const [projects,phases,focus,review]=await Promise.all([
  auth.reader.from('projects').select('id,title,priority,lifecycle,deadline_date,deadline_kind,next_action,version').limit(500),
  auth.reader.from('development_phases').select('project_id,state').limit(1000),
  auth.reader.from('focus_plans').select('focus_items(project_id,slot)').eq('week_start',week).maybeSingle(),
  auth.reader.from('control_recommendations').select('id,project_id,kind,state,score,details,proposed,created_at,source_version').eq('state','pending').order('created_at',{ascending:false}).limit(150)
 ]);
 const error=projects.error||phases.error||focus.error||review.error;
 if(error)throw error;
 const focusIds=(focus.data?.focus_items||[]).map((x:{project_id:string})=>x.project_id);
 const output=prioritizePortfolio(projects.data||[],{today,phases:phases.data||[],focusIds,capacity});
 return {...output,week,today,focusIds,pending:review.data||[]};
}
export function recommendationFingerprint(row:{id:string;version:number;score:number;factors:unknown},
 kind:string,week:string,capacity:number,focusIds:string[]){
 return createHash('sha256').update(JSON.stringify({engine:ENGINE_VERSION,project:row.id,
  version:row.version,score:row.score,factors:row.factors,kind,week,capacity,focusIds:[...focusIds].sort()})).digest('hex');
}
