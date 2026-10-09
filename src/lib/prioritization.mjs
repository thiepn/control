// P4 deterministic, inspectable rules. No hosted AI inference, hidden scoring or fabricated estimates.
// All suggestions are advisory until the owner explicitly approves a persisted proposal.
const PRIORITY_POINTS={P0:30,P1:22,P2:12,P3:4};
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)
  &&!Number.isNaN(Date.parse(s+'T00:00:00Z'))
  &&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const daysBetween=(a,b)=>Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
const blockedStates=new Set(['waiting','paused']);
export const ENGINE_VERSION='p4-rules-1';
export function evaluateProject(p,{today,phaseStates=[],focusIds=[]}={}){
 if(!isDate(today))throw Error('A concrete local date is required');
 if(!p||typeof p.id!=='string'||typeof p.title!=='string')throw Error('Invalid project');
 if(['archived','completed'].includes(p.lifecycle))return null;
 let raw=10;
 const factors=[{key:'baseline',points:10,label:'Eligible project'}];
 const plus=(key,points,label)=>{raw+=points;factors.push({key,points,label})};
 const priority=PRIORITY_POINTS[p.priority];
 if(priority!==undefined)plus('manual_priority',priority,'Existing '+p.priority+' priority');
 else plus('no_manual_priority',0,'Priority not set; no priority inferred');
 if(p.deadline_date){
  if(!isDate(p.deadline_date))throw Error('Invalid project deadline');
  const until=daysBetween(p.deadline_date,today);
  if(until<0)plus('deadline_overdue',32,'Deadline overdue by '+(-until)+' day(s)');
  else if(until<=3)plus('deadline_imminent',27,'Deadline in '+until+' day(s)');
  else if(until<=7)plus('deadline_week',18,'Deadline within seven days');
  else if(until<=14)plus('deadline_soon',9,'Deadline within fourteen days');
  if(p.deadline_kind==='hard'&&until<=14)plus('hard_deadline',5,'Hard deadline');
 }
 if(p.lifecycle==='active')plus('active_work',12,'Work marked active');
 if(p.lifecycle==='planned')plus('planned_work',4,'Work marked planned');
 if(blockedStates.has(p.lifecycle))plus('work_blocked',-38,'Work marked '+p.lifecycle);
 if(phaseStates.includes('blocked'))plus('blocked_phase',-25,'At least one phase is blocked');
 if(phaseStates.includes('verification'))plus('review_pending',6,'Phase is in verification');
 if(!p.next_action||!p.next_action.trim())plus('missing_next_action',-13,'No next action specified');
 if(focusIds.includes(p.id))plus('already_focused',2,'Already in this week’s focus');
 const score=Math.max(0,Math.min(100,raw));
 const blocked=blockedStates.has(p.lifecycle)||phaseStates.includes('blocked');
 // Conservative; don't suggest P0 solely because a date approaches.
 const suggestedPriority=score>=85?'P0':score>=60?'P1':score>=35?'P2':'P3';
 return {id:p.id,title:p.title,lifecycle:p.lifecycle,currentPriority:p.priority??null,
  version:p.version,deadline:p.deadline_date??null,nextAction:p.next_action??null,
  score,factors,blocked,suggestedPriority,priorityChange:suggestedPriority!==p.priority,
  confidence:!p.deadline_date||!p.next_action?'limited':'contextual',source:ENGINE_VERSION};
}
export function prioritizePortfolio(projects,{today,phases=[],focusIds=[],capacity=3}={}){
 if(!Array.isArray(projects)||!Array.isArray(phases)||!Array.isArray(focusIds)
   ||!Number.isInteger(capacity)||capacity<1||capacity>3||new Set(focusIds).size!==focusIds.length)
  throw Error('Invalid planning context');
 const states=new Map();
 for(const p of phases){if(!states.has(p.project_id))states.set(p.project_id,[]);
  states.get(p.project_id).push(p.state);
 }
 const ranked=projects.map(p=>evaluateProject(p,{today,phaseStates:states.get(p.id)||[],focusIds}))
   .filter(Boolean).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)||a.id.localeCompare(b.id));
 const available=Math.max(0,capacity-focusIds.length);
 const focusSuggestions=ranked.filter(r=>!r.blocked&&!focusIds.includes(r.id)
   &&r.score>=18&&['active','planned','inbox'].includes(r.lifecycle)).slice(0,available)
   .map(r=>({...r,kind:'focus',weekCapacity:capacity}));
 return {ranked,focusSuggestions,capacity,occupied:focusIds.length,available,
  policy:'Recommendations are deterministic and never apply themselves.',source:ENGINE_VERSION};
}
