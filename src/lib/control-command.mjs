import {aggregateProgress} from './progress.mjs';
import {prioritizePortfolio} from './prioritization.mjs';

// All inputs are already owner-scoped by authenticated APIs. This is UI-only derivation.
export function berlinDate(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',
  year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
  .filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
export function summarizeProjects(projects,targets,phases){
 const targetMap=new Map(targets.map(t=>[t.project_id,t]));
 const phaseMap=new Map();
 for(const phase of phases){
  if(!phaseMap.has(phase.project_id))phaseMap.set(phase.project_id,[]);
  phaseMap.get(phase.project_id).push(phase);
 }
 const rank={in_progress:0,verification:1,blocked:2,planned:3,completed:4};
 const results=new Map();
 for(const project of projects){
  const target=targetMap.get(project.id);
  const progress=aggregateProgress(target?.milestones||[]);
  const current=[...(phaseMap.get(project.id)||[])].sort((a,b)=>
   (rank[a.state]??5)-(rank[b.state]??5)
   ||Number((b.phase_key||'').replace(/^P/,''))-Number((a.phase_key||'').replace(/^P/,''))
   ||a.phase_key.localeCompare(b.phase_key))[0]||null;
  results.set(project.id,{target:target?.name||null,progress,
   phase:current?{key:current.phase_key,title:current.title,state:current.state}:null});
 }
 return results;
}
export function selectNextAction(projects,ranked,focusItems,phases){
 const byId=new Map(projects.map(p=>[p.id,p]));
 const blockedPhase=new Set(phases.filter(p=>p.state==='blocked').map(p=>p.project_id));
 const eligible=p=>p&&!['waiting','paused','archived','completed'].includes(p.lifecycle)&&!blockedPhase.has(p.id);
 for(const entry of [...focusItems].sort((a,b)=>a.slot-b.slot)){
  const project=byId.get(entry.project_id);
  if(eligible(project))return {project,source:'weekly_focus',action:project.next_action?.trim()||null};
 }
 for(const rank of ranked){
  const project=byId.get(rank.id);
  if(eligible(project)&&project.next_action?.trim())
   return {project,source:'suggested',action:project.next_action.trim(),score:rank.score};
 }
 return null;
}
export function commandSnapshot(projects,targets,phases,focusItems){
 const summary=summarizeProjects(projects,targets,phases);
 const focusIds=focusItems.map(x=>x.project_id);
 const ranking=prioritizePortfolio(projects,{today:berlinDate(),phases,focusIds,capacity:3});
 return {summary,ranking,next:selectNextAction(projects,ranking.ranked,focusItems,phases)};
}

// When milestone/phase API is unavailable, never infer rank or clearance.
// Only display the human's explicitly recorded weekly focus and known next action.
export function focusWhenProgressUnavailable(projects,focusItems){
 const projectsById=new Map(projects.map(p=>[p.id,p]));
 for(const entry of [...focusItems].sort((a,b)=>a.slot-b.slot)){
  const project=projectsById.get(entry.project_id);
  if(project && ['inbox','planned','active'].includes(project.lifecycle))
   return {summary:new Map(),next:{project,source:'focus_unverified',
     action:project.next_action?.trim()||null},phaseUnavailable:true};
 }
 return {summary:new Map(),next:null,phaseUnavailable:true};
}
