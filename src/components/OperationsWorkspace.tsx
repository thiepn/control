'use client';
import {useCallback,useEffect,useState} from 'react';
type Project={id:string;title:string};
type Summary={
 asOf:string;week:string;partial:boolean;
 projects:{total:number;byState:Record<string,number>;overdue:number;approaching:number;hardDeadlines:number;
 missingNextAction:number;blockedLifecycle:number;blockedPhaseProjects:number};
 milestones:{total:number;reported:number;verified:number;unverified:number};
 focus:{selected:number;capacity:number};
 reviews:{submittedCount:number;currentWeekSubmitted:boolean};
 evidence:{observed:number;latestObservedAt:string|null};methodology:string};
type Diagnostic={id:string;label:string;status:string;detail:string};
type AuditEntry={id:string;project_id:string|null;actor:string;action:string;source_ref:string|null;
 created_at:string;previous_data:unknown;new_data:unknown};
type Review={id:string;week_start:string;state:'draft'|'submitted';version:number;
 wins:string;blockers:string;next_week:string;snapshot:{projects_active?:number;projects_completed?:number;
 focus_project_ids?:string[]};updated_at:string;submitted_at:string|null};
const blank={wins:'',blockers:'',next_week:''};
export default function OperationsWorkspace({projects}:{projects:Project[]}){
 const [summary,setSummary]=useState<Summary|null>(null),[diagnostics,setDiagnostics]=useState<Diagnostic[]>([]);
 const [reviews,setReviews]=useState<Review[]>([]),[week,setWeek]=useState('');
 const [notes,setNotes]=useState(blank),[dirty,setDirty]=useState(false),[audit,setAudit]=useState<AuditEntry[]>([]);
 const [page,setPage]=useState(0),[hasMore,setHasMore]=useState(false),[filter,setFilter]=useState('');
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [online,setOnline]=useState(true);
 const projectName=(id:string|null)=>projects.find(p=>p.id===id)?.title||'Portfolio';
 const get=async(path:string)=>{
  const r=await fetch(path,{cache:'no-store'});
  if(!r.ok){if(r.status===401)throw Error('Your session expired. Reload to sign in again.');throw Error('Unable to retrieve operations data');}
  return r.json();
 };
 const refresh=useCallback(async(currentPage:number,currentFilter:string,preserveDraft:boolean)=>{
  setLoading(true);setError('');
  try{
   const [over,reviewData,auditData]=await Promise.all([
    get('/api/operations/overview'),get('/api/operations/reviews'),
    get('/api/operations/audit?page='+currentPage+(currentFilter?'&project='+encodeURIComponent(currentFilter):''))
   ]);
   setSummary(over.summary);setDiagnostics(over.integrations);
   setReviews(reviewData.reviews);setWeek(reviewData.thisWeek);
   if(!preserveDraft){
    const current=(reviewData.reviews as Review[]).find(r=>r.week_start===reviewData.thisWeek);
    setNotes(current?{wins:current.wins,blockers:current.blockers,next_week:current.next_week}:blank);
    setDirty(false);
   }
   setAudit(auditData.entries);setHasMore(auditData.hasMore);
  }catch(e){setError(e instanceof Error?e.message:'Data unavailable');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{const change=()=>setOnline(navigator.onLine);
  change();window.addEventListener('online',change);window.addEventListener('offline',change);
  return()=>{window.removeEventListener('online',change);window.removeEventListener('offline',change);}
 },[]);
 useEffect(()=>{refresh(page,filter,dirty);},[page,filter,refresh]);
 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{
  if(dirty){event.preventDefault();event.returnValue='';}
 };window.addEventListener('beforeunload',guard);
 return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 const copyDraft=async()=>{
  const text=['P6 REVIEW RECOVERY COPY',week,
   'Wins:',notes.wins,'Blockers:',notes.blockers,'Next week:',notes.next_week].join('\n');
  try{await navigator.clipboard.writeText(text);setNotice('Review text copied locally; no upload performed.');setError('');}
  catch{setError('Clipboard unavailable. Select and copy the text before refreshing.');}
 };
 const review=reviews.find(r=>r.week_start===week);
 const edit=(key:keyof typeof blank,value:string)=>{setNotes(x=>({...x,[key]:value}));setDirty(true);};
 const submit=async(action:'draft'|'submit')=>{
  if(!week||busy||!online)return;
  setBusy(true);setError('');setNotice('');
  try{
   const result=await fetch('/api/operations/reviews',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({week_start:week,version:review?.version||0,action,...notes})});
   const data=await result.json();
   if(!result.ok){if(result.status===409)throw Error('This review changed. Copy your draft before refreshing.');throw Error(data.error||'Review save failed');}
   setDirty(false);await refresh(page,filter,false);
   setNotice(action==='submit'?'Weekly review submitted and locked':'Draft saved with an audit record');
  }catch(e){setError(e instanceof Error?e.message:'Review save failed');}
  finally{setBusy(false);}
 };
 const changeFilter=(value:string)=>{setPage(0);setFilter(value);};
 const reload=()=>refresh(page,filter,true);
 return <section className="operations" aria-label="Portfolio operations and weekly reviews">
  <div className="section-label"><strong>PORTFOLIO INSIGHTS</strong><span>RECORDED DATA ONLY</span></div>
  <div className="ops-toolbar">
   <span aria-live="polite">{online?'Network reports online — server not verified':'Offline — changes disabled'}</span>
   <button type="button" onClick={reload} disabled={loading||busy}>Retry / refresh data</button>
   <button type="button" onClick={()=>window.location.reload()}>Reload session</button>
  </div>
  <p className="note" role="status" aria-live="polite">{loading?'Updating portfolio…':notice}</p>
  {error&&<div className="status failure" role="alert">{error} <button type="button" onClick={reload}>Retry</button></div>}
  {summary&&<>
   <div className="ops-metrics">
    {[
      ['Projects',summary.projects.total],['Active',summary.projects.byState.active||0],
      ['Overdue',summary.projects.overdue],['Due in 7 days',summary.projects.approaching],
      ['Recorded blockers',summary.projects.blockedLifecycle+summary.projects.blockedPhaseProjects],
      ['Missing next steps',summary.projects.missingNextAction],
      ['Verified milestones',summary.milestones.verified+' / '+summary.milestones.total],
      ['Weekly focus',summary.focus.selected+' / '+summary.focus.capacity]
    ].map(([label,value])=><div key={label} className="ops-metric"><span>{label}</span><strong>{value}</strong></div>)}
   </div>
   <p className="note">{summary.methodology}</p>
   {summary.partial&&<p className="status failure" role="status">Some datasets reached the query limit. Values are partial, not portfolio-wide totals.</p>}
  </>}
  <div className="section-label"><strong>WEEKLY REVIEW</strong><span>{week||'CURRENT WEEK'}</span></div>
  {review?.state==='submitted'?<div className="ops-review-locked">
   <strong>Submitted and locked</strong><p>Saved {review.submitted_at?.slice(0,10)}. This entry is preserved as review evidence, not proof of release acceptance.</p>
   <dl><dt>Wins</dt><dd>{review.wins||'Not recorded'}</dd><dt>Blockers</dt><dd>{review.blockers||'Not recorded'}</dd><dt>Next week</dt><dd>{review.next_week||'Not recorded'}</dd></dl>
   <p className="note">Snapshot: {review.snapshot?.projects_active??'—'} active projects, {review.snapshot?.projects_completed??'—'} completed, {review.snapshot?.focus_project_ids?.length??'—'} focus selections.</p>
  </div>:<form className="ops-review-form" onSubmit={e=>{e.preventDefault();submit('draft');}}>
   <p className="note">Save a draft or submit the week. Submission is permanent; both decisions are audited.</p>
   {([['wins','Wins and completed work'],['blockers','Outstanding blockers'],['next_week','Plan for next week']] as const).map(([key,label])=>
    <label key={key}>{label}<textarea value={notes[key]} rows={3} maxLength={2000} onChange={e=>edit(key,e.target.value)} placeholder={'Write '+label.toLowerCase()+'…'}/></label>)}
   <div className="ops-actions">
    <button type="submit" disabled={busy||loading||!online||!week}>Save draft</button>
    <button type="button" disabled={busy||!dirty} onClick={copyDraft}>Copy unsaved review</button>
    <button type="button" disabled={busy||loading||!online||!week} onClick={()=>submit('submit')}>Submit and lock review</button>
    <span>{dirty?'Unsaved changes':'All changes saved or unchanged'}</span>
   </div>
  </form>}
  <div className="ops-review-history"><strong>Earlier reviews</strong>
   {reviews.filter(r=>r.week_start!==week).slice(0,7).map(r=><details key={r.id}>
    <summary>{r.week_start} — {r.state} (revision {r.version})</summary>
    <p>Wins: {r.wins||'Not recorded'}</p><p>Blockers: {r.blockers||'Not recorded'}</p><p>Next: {r.next_week||'Not recorded'}</p>
   </details>)}
   {reviews.length<=1&&<p className="note">No earlier reviews recorded.</p>}
  </div>
  <div className="section-label"><strong>INTEGRATION DIAGNOSTICS</strong><span>CONFIGURATION IS NOT CONNECTIVITY</span></div>
  <div className="ops-diagnostics">{diagnostics.map(d=><article key={d.id} className="ops-diagnostic">
   <strong>{d.label}</strong><span>{d.status.replaceAll('_',' ')}</span><p>{d.detail}</p>
  </article>)}</div>
  <div className="section-label"><strong>AUDIT & PROVENANCE</strong><span>OWNER-ONLY HISTORY</span></div>
  <div className="ops-toolbar"><label htmlFor="ops-filter">Project</label><select id="ops-filter" value={filter} onChange={e=>changeFilter(e.target.value)}>
   <option value="">All projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
  </select></div>
  {!audit.length&&!loading&&<p className="empty">No audit records found for this page.</p>}
  <div className="ops-audit">{audit.map(a=><details key={a.id}>
   <summary><time dateTime={a.created_at}>{new Date(a.created_at).toLocaleString('de-DE')}</time>
    <span>{projectName(a.project_id)}</span><strong>{a.action}</strong><small>{a.actor}</small></summary>
   <div className="ops-audit-detail"><p>Source: {a.source_ref||'Internal action'}</p>
    <details><summary>View recorded change (may contain private details)</summary>
     <pre>{JSON.stringify({before:a.previous_data,after:a.new_data},null,2)}</pre></details>
   </div>
  </details>)}</div>
  <div className="ops-pages"><button type="button" disabled={loading||page===0} onClick={()=>setPage(p=>p-1)}>Previous</button>
   <span>Page {page+1}</span><button type="button" disabled={loading||!hasMore||page>=20} onClick={()=>setPage(p=>p+1)}>Next</button></div>
 </section>;
}
