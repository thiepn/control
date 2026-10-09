'use client';
import {useEffect,useState} from 'react';

type Factor={key:string;points:number;label:string};
type Ranked={id:string;title:string;version:number;score:number;factors:Factor[];
 lifecycle:string;currentPriority:string|null;suggestedPriority:string;priorityChange:boolean;
 blocked:boolean;confidence:string;deadline:string|null;nextAction:string|null};
type Pending={id:string;project_id:string;kind:string;score:number;source_version:number;
 proposed:{priority?:string;week?:string;capacity?:number};details:{factors?:Factor[]}};
type Snapshot={ranked:Ranked[];focusSuggestions:Ranked[];pending:Pending[];
 focusIds:string[];capacity:number;occupied:number;available:number;today:string;week:string};

export default function RecommendationsWorkspace(){
 const [capacity,setCapacity]=useState(3),[data,setData]=useState<Snapshot|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const refresh=async(c=capacity)=>{
  const result=await fetch('/api/recommendations?capacity='+c,{cache:'no-store'});
  const json=await result.json();
  if(!result.ok)throw Error(json.error||'Unable to load recommendations');
  setData(json as Snapshot);
 };
 useEffect(()=>{refresh(capacity).catch(e=>setMessage(e.message));},[capacity]);
 const act=async(path:string,body:object,method:'POST'|'PATCH')=>{
  setBusy(true);setMessage('');
  try{
   const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const json=await response.json();
   if(!response.ok)throw Error(json.error||'Action failed');
   await refresh();setMessage(method==='POST'?'Recommendation queued for review':'Decision saved and audited');
  }catch(e){setMessage(e instanceof Error?e.message:'Action failed');}
  finally{setBusy(false);}
 };
 const queue=(project_id:string,kind:string)=>act('/api/recommendations',{project_id,kind,capacity},'POST');
 const decide=(id:string,decision:string)=>act('/api/recommendations/'+id,{decision},'PATCH');
 const name=(id:string)=>data?.ranked.find(r=>r.id===id)?.title||'Project';
 return <section aria-label="Prioritization and focus recommendations" className="recommendations">
   <div className="section-label"><strong>PRIORITY INTELLIGENCE</strong><span>EXPLAINABLE RULES — NOT AN AI VERDICT</span></div>
   <p className="note">Scores explain urgency and recorded project state. Missing dates or next actions reduce context. No recommendation changes anything until you explicitly approve it.</p>
   <div className="priority-controls"><label htmlFor="p4-capacity">Weekly capacity
    <select id="p4-capacity" value={capacity} onChange={e=>setCapacity(Number(e.target.value))}>
     {[1,2,3].map(n=><option value={n} key={n}>{n} project{n!==1?'s':''}</option>)}
    </select></label><span>{data?data.occupied+' / '+data.capacity+' slots used':'Loading…'}</span>
    <button type="button" disabled={busy} onClick={()=>refresh().catch(e=>setMessage(e.message))}>Refresh analysis</button>
   </div>
   <p className="note" role="status" aria-live="polite">{message}</p>
   {data&&<>
    <div className="section-label"><strong>FOCUS SUGGESTIONS</strong><span>{data.available} OPEN SLOTS</span></div>
    {!data.focusSuggestions.length&&<p className="empty">No new focus slots recommended with the current capacity and recorded blockers.</p>}
    <div className="priority-focus">
     {data.focusSuggestions.map(r=><article key={r.id} className="priority-card">
      <h2>{r.title}</h2><p>Priority score {r.score}/100 — {r.nextAction||'Define a next step'}</p>
      <button disabled={busy} onClick={()=>queue(r.id,'focus')}>Queue focus recommendation</button>
     </article>)}
    </div>
    <div className="section-label"><strong>RANKED PROJECTS</strong><span>{data.ranked.length} ELIGIBLE</span></div>
    {data.ranked.map((r,i)=><article key={r.id} className="priority-project">
     <header><div><small>RANK {String(i+1).padStart(2,'0')} · {r.lifecycle.toUpperCase()}</small><h2>{r.title}</h2></div>
      <strong className="priority-score">{r.score}<small> / 100</small></strong></header>
     <p>{r.blocked?'BLOCKER RECORDED · ':''} {r.confidence==='limited'?'LIMITED CONTEXT':'CONTEXT AVAILABLE'} · Current {r.currentPriority||'unset'} · Suggested {r.suggestedPriority}</p>
     <ul className="factor-list">{r.factors.map(f=><li key={f.key}><span>{f.label}</span><b>{f.points>0?'+':''}{f.points}</b></li>)}</ul>
     {r.deadline&&<p>Deadline: <time dateTime={r.deadline}>{r.deadline}</time></p>}
     <div className="priority-actions">
      {r.priorityChange&&<button disabled={busy} onClick={()=>queue(r.id,'priority')}>Queue {r.suggestedPriority} suggestion</button>}
      {r.blocked&&<button disabled={busy} onClick={()=>queue(r.id,'blocker')}>Queue blocker review</button>}
     </div>
    </article>)}
    <div className="section-label"><strong>DECISION QUEUE</strong><span>{data.pending.length} PENDING</span></div>
    {!data.pending.length&&<p className="empty">No queued recommendations. Queue one above to review it.</p>}
    {data.pending.map(p=><article key={p.id} className="priority-decision">
      <div><strong>{name(p.project_id)}</strong><p>{p.kind.toUpperCase()} · SCORE {p.score} · {p.proposed.priority||p.proposed.week||'Acknowledgment only'} · Project revision {p.source_version}</p></div>
      <div className="priority-actions">
       <button disabled={busy} onClick={()=>decide(p.id,'rejected')}>Reject</button>
       <button disabled={busy} onClick={()=>decide(p.id,'accepted')}>{p.kind==='blocker'?'Acknowledge':'Approve'}</button>
      </div>
     </article>)}
   </>}
  </section>;
}
