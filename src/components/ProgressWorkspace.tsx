'use client';
import {useEffect,useMemo,useState} from 'react';
import {aggregateProgress,deadlineSignal} from '@/lib/progress.mjs';
import {focusDraftKey,focusDraftValue,clearFocusDraft} from '@/lib/focus-drafts.mjs';
import {readProgressData} from '@/lib/progress-response.mjs';
type Project={id:string;title:string;deadline_date:string|null;deadline_kind:string|null;lifecycle:string};
type Milestone={id:string;title:string;weight:number;completion_fraction:number|null;evidence_grade:string;release_gate:string;gate_passed:boolean|null;verified_at:string|null;verified_by:string|null};
type Target={id:string;project_id:string;name:string;definition_of_done:string;milestones:Milestone[]};
type Phase={id:string;project_id:string;phase_key:string;title:string;state:string;notes:string|null};
type Focus={week_start:string;focus_items:{project_id:string;slot:number;objective:string}[]};
export default function ProgressWorkspace({projects,onChange}:{projects:Project[];onChange?:()=>Promise<void>}){
 const [targets,setTargets]=useState<Target[]>([]),[phases,setPhases]=useState<Phase[]>([]),[focus,setFocus]=useState<Focus[]>([]);
 const [project,setProject]=useState(''),[name,setName]=useState(''),[definition,setDefinition]=useState('');
 const [milestone,setMilestone]=useState(''),[weight,setWeight]=useState('1'),[phaseKey,setPhaseKey]=useState('P1'),[phaseTitle,setPhaseTitle]=useState(''),[phaseState,setPhaseState]=useState('planned');
 const [objectiveDrafts,setObjectiveDrafts]=useState<Record<string,string>>({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [progressLoad,setProgressLoad]=useState<'loading'|'ready'|'unavailable'>('loading');
 const today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Berlin'});
 const selected=projects.find(p=>p.id===project);
 const current=targets.find(t=>t.project_id===project);
 const progress=useMemo(()=>aggregateProgress(current?.milestones||[]),[current]);
 const reload=async()=>{
  setProgressLoad('loading');
  try{
   const x=await readProgressData(await fetch('/api/progress',{cache:'no-store'}));
   setTargets(x.targets);setPhases(x.phases);setFocus(x.focus);
   setProgressLoad('ready');
  }catch(e){setProgressLoad('unavailable');throw e;}
 };
 useEffect(()=>{reload().catch(e=>setMessage(e.message))},[]);
 useEffect(()=>{if(!project&&projects.length)setProject(projects[0].id)},[project,projects]);
 const act=async(action:string,payload:Record<string,unknown>)=>{
  setBusy(true);setMessage('');
  try{const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:project,action,payload})});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Action failed');
   try{await reload();await onChange?.();setMessage('Saved');}
   catch{setMessage('Saved to the database, but the refreshed dashboard could not be loaded. Reconnect to verify.');}
   return true;}
  catch(e){setMessage(e instanceof Error?e.message:'Action failed');return false;}finally{setBusy(false)}
 };
 return <section aria-label="Progress workspace">
  <div className="section-label"><strong>MILESTONES AND PHASES</strong><span>Evidence before completion</span></div>
  <div className="portfolio-tools">
   <label>PROJECT<select aria-label="Progress project" value={project} onChange={e=>setProject(e.target.value)}>{projects.filter(p=>p.lifecycle!=='archived').map(p=><option value={p.id} key={p.id}>{p.title}</option>)}</select></label>
  </div>
  {!selected?<p className="empty">Create a project in Portfolio first.</p>:
   progressLoad!=='ready'?<div role="status" className="status failure">
    <p>{progressLoad==='loading'?'Loading recorded outcomes and milestones…':'Recorded progress is unavailable, not empty. Do not create another outcome until existing records can be checked.'}</p>
    {progressLoad==='unavailable'&&<button type="button" disabled={busy}
     onClick={()=>reload().then(()=>setMessage('')).catch(e=>setMessage(e instanceof Error?e.message:'Progress unavailable'))}>Retry progress read</button>}
   </div>:<>
   <div className="summary-line" role="status">
    <span><strong>{progress.reported===null?'—':progress.reported+'%'}</strong> Reported</span>
    <span><strong>{progress.verified===null?'—':progress.verified+'%'}</strong> Verified</span>
    <span><strong>{selected.deadline_date||'—'}</strong> Deadline</span>
    <span><strong>{deadlineSignal(selected.deadline_date,today)}</strong> Timing</span>
   </div>
   <p className="note">Reported completion is not independently verified. Only evidence-approved milestones count toward verified progress.</p>
   {!current?<form className="quick-add" onSubmit={e=>{e.preventDefault();act('target.create',{name,definition_of_done:definition})}}>
    <label>NEW OUTCOME<input required maxLength={160} value={name} onChange={e=>setName(e.target.value)} placeholder="Release candidate"/></label>
    <label>DEFINITION OF DONE<input required maxLength={1000} value={definition} onChange={e=>setDefinition(e.target.value)} placeholder="Observable acceptance criteria"/></label>
    <button disabled={busy} type="submit">Create outcome</button>
   </form>:<>
    <h2>{current.name}</h2><p>{current.definition_of_done}</p>
    <div className="table-wrap"><table><thead><tr><th>Milestone</th><th>Weight</th><th>Reported</th><th>Evidence</th></tr></thead>
     <tbody>{(current.milestones||[]).map(m=><tr key={m.id}><td>{m.title}</td><td>{m.weight}</td><td>
      <select aria-label={'Report '+m.title} value={m.completion_fraction===null?'':m.completion_fraction} disabled={busy}
        onChange={e=>{if(e.target.value!=='')act('milestone.report',{milestone_id:m.id,fraction:Number(e.target.value)});}}>
       <option value="" disabled>Unassessed</option>
       {[0,0.25,0.5,0.75,1].map(x=><option key={x} value={x}>{x*100}%</option>)}
      </select></td><td>{m.evidence_grade==='verified'?'Verified':'Not verified'}</td></tr>)}</tbody></table></div>
    <form className="quick-add" onSubmit={e=>{e.preventDefault();act('milestone.create',{target_id:current.id,title:milestone,weight:Number(weight)}).then(saved=>{if(saved)setMilestone('');})}}>
     <label>NEW MILESTONE<input required value={milestone} onChange={e=>setMilestone(e.target.value)}/></label>
     <label>WEIGHT<input type="number" min="0.0001" max="10000" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)}/></label>
     <button type="submit" disabled={busy}>Add milestone</button>
    </form>
   </>}
   <div className="section-label"><strong>DEVELOPMENT PHASES</strong><span>Manual state, evidence-required qualification</span></div>
   <div className="table-wrap"><table><thead><tr><th>Phase</th><th>State</th><th>Review</th></tr></thead><tbody>
    {phases.filter(p=>p.project_id===project).map(p=><tr key={p.id}><td>{p.phase_key} — {p.title}</td><td>{p.state}</td><td>Required</td></tr>)}
   </tbody></table></div>
   <form className="quick-add" onSubmit={e=>{e.preventDefault();act('phase.set',{phase_key:phaseKey,state:phaseState,title:phaseTitle.trim()||phaseKey})}}>
    <label>PHASE<input required pattern="P[0-9]{1,3}" value={phaseKey} onChange={e=>setPhaseKey(e.target.value)}/></label>
    <label>PHASE TITLE<input value={phaseTitle} maxLength={160} onChange={e=>setPhaseTitle(e.target.value)} placeholder="What this phase delivers"/></label>
    <label>STATE<select value={phaseState} onChange={e=>setPhaseState(e.target.value)}>{['planned','in_progress','verification','blocked'].map(x=><option key={x}>{x}</option>)}</select></label>
    <button disabled={busy} type="submit">Save phase</button>
   </form>
   {focus.flatMap(f=>f.focus_items.filter(i=>i.project_id===project).map(i=>{
    const key=focusDraftKey(project,f.week_start);
    return <form className="quick-add" key={f.week_start+'-'+i.slot} onSubmit={e=>{
      e.preventDefault();
      act('focus.objective',{week:f.week_start,objective:focusDraftValue(objectiveDrafts,project,f.week_start,i.objective)})
       .then(saved=>{if(saved)setObjectiveDrafts(d=>clearFocusDraft(d,project,f.week_start));});
     }}>
     <label>WEEKLY OBJECTIVE ({f.week_start})<input required maxLength={500}
      value={focusDraftValue(objectiveDrafts,project,f.week_start,i.objective)}
      onChange={e=>{const value=e.target.value;setObjectiveDrafts(d=>({...d,[key]:value}));}}/></label>
     <button disabled={busy} type="submit">Save objective</button>
    </form>;
   }))}
   <p role="status" className="note">{message}</p>
  </>}
 </section>;
}
