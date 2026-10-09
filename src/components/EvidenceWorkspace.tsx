'use client';
import {useEffect,useState} from 'react';
type Project={id:string;title:string};
type Event={id:string;project_id:string;event_type:string;event_sha:string;observed_at:string;payload:{conclusion?:string|null;url?:string|null;action?:string|null}};
type Proposal={id:string;project_id:string;proposal_type:string;rationale:string;state:string;proposed_value:{sha?:string}};
type Phase={id:string;project_id:string;phase_key:string;title:string;head_sha:string|null};
export default function EvidenceWorkspace({projects}:{projects:Project[]}){
 const [events,setEvents]=useState<Event[]>([]),[proposals,setProposals]=useState<Proposal[]>([]);
 const [phases,setPhases]=useState<Phase[]>([]),[phaseSelection,setPhaseSelection]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState(''),[working,setWorking]=useState(false);
 const projectName=(id:string)=>projects.find(p=>p.id===id)?.title||'Unknown project';
 const refresh=async()=>{const [r,p]=await Promise.all([fetch('/api/github/evidence',{cache:'no-store'}),fetch('/api/progress',{cache:'no-store'})]);if(!r.ok||!p.ok)throw Error('Evidence unavailable');const x=await r.json(),details=await p.json();setEvents(x.events);setProposals(x.proposals);setPhases(details.phases||[])};
 useEffect(()=>{refresh().catch(e=>setNotice(e.message))},[]);
 const act=async(path:string,options:RequestInit)=>{
  setWorking(true);setNotice('');
  try{const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');
   await refresh();setNotice(path.includes('reconcile')?'GitHub evidence synchronized':'Decision recorded without changing progress');}
  catch(e){setNotice(e instanceof Error?e.message:'Request failed');}finally{setWorking(false);}
 };
 return <section aria-label="GitHub evidence">
  <div className="section-label"><strong>GITHUB EVIDENCE</strong><span>Verified sources, explicit decisions</span></div>
  <p className="note">GitHub CI results never directly mark milestones complete. Review-only suggestions remain pending until acknowledged.</p>
  <button className="submit" disabled={working} onClick={()=>act('/api/github/reconcile',{method:'POST',headers:{'Content-Type':'application/json'}})}>Synchronize linked repositories</button>
  <p role="status" className="note">{notice}</p>
  <div className="section-label"><strong>REVIEW PROPOSALS</strong><span>{proposals.filter(x=>x.state==='pending').length} pending</span></div>
  {proposals.filter(x=>x.state==='pending').map(p=><article key={p.id} className="candidate">
   <div><b>{projectName(p.project_id)} — {p.proposal_type}</b><small>{p.rationale}</small><small>Head {p.proposed_value?.sha?.slice(0,12)||'Unknown'}</small></div>
   <div className="candidate-actions"><button disabled={working} onClick={()=>act('/api/github/proposals/'+p.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:'rejected'})})}>Reject</button>
   <button disabled={working} onClick={()=>act('/api/github/proposals/'+p.id,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision:'accepted'})})}>Acknowledge</button></div>
  </article>)}
  {!proposals.some(p=>p.state==='pending')&&<p className="empty">No new review proposals.</p>}
  <div className="section-label"><strong>RECENT EVIDENCE</strong><span>{events.length} recorded</span></div>
  <div className="table-wrap"><table><thead><tr><th>Project</th><th>Event</th><th>Exact SHA</th><th>Conclusion</th><th>Observed</th><th>Track phase</th></tr></thead>
   <tbody>{events.map(e=><tr key={e.id}><td>{projectName(e.project_id)}</td><td>{e.event_type}</td><td><code>{e.event_sha.slice(0,12)}</code></td><td>{e.payload?.conclusion||'—'}</td><td>{new Date(e.observed_at).toLocaleDateString()}</td><td><select aria-label={'Phase for '+e.event_sha.slice(0,12)} value={phaseSelection[e.id]||''} onChange={change=>setPhaseSelection({...phaseSelection,[e.id]:change.target.value})}><option value="">Choose phase</option>{phases.filter(p=>p.project_id===e.project_id).map(p=><option key={p.id} value={p.phase_key}>{p.phase_key} — {p.title}</option>)}</select><button disabled={working||!phaseSelection[e.id]} onClick={()=>act('/api/github/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({project_id:e.project_id,phase_key:phaseSelection[e.id],sha:e.event_sha})})}>Track head</button></td></tr>)}</tbody>
  </table></div>
 </section>;
}
