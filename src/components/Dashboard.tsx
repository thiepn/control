'use client';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { installDialogFocusTrap } from '@/lib/dialog-focus.mjs';
import { browserClient } from '@/lib/supabase/browser';
import ProgressWorkspace from './ProgressWorkspace';
import EvidenceWorkspace from './EvidenceWorkspace';
import RecommendationsWorkspace from './RecommendationsWorkspace';
import OperationsWorkspace from './OperationsWorkspace';
import RepositoryDiscovery from './RepositoryDiscovery';
import {commandSnapshot,focusWhenProgressUnavailable} from '@/lib/control-command.mjs';
type Project={id:string;title:string;slug:string;summary:string|null;category:string|null;priority:string|null;lifecycle:string;manual_rank:number|null;deadline_date:string|null;deadline_kind:string|null;next_action:string|null;version:number};
type Candidate={id:string;full_name:string;github_repository_id:number;review_status:string;review_note:string|null;project_id:string|null};
type RepoLink={project_id:string;full_name:string|null;link_role:string};
type Focus={week:string;items:{slot:number;project_id:string;objective:string}[]};
type ProgressData={targets:{id:string;project_id:string;name:string;milestones:{weight:number;completion_fraction:number|null;evidence_grade:string;release_gate:string;gate_passed:boolean|null;verified_at:string|null;verified_by:string|null}[]}[];phases:{project_id:string;phase_key:string;title:string;state:string}[];focus:unknown[]};
const states=['inbox','planned','active','waiting','paused','completed','archived'];
const ps=['P0','P1','P2','P3'];
async function api<T>(path:string, options:RequestInit={}):Promise<T>{const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})},cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||`HTTP ${response.status}`);return result as T;}
export default function Dashboard(){
 const [rows,setRows]=useState<Project[]>([]);const [focus,setFocus]=useState<Focus>({week:'',items:[]});const [candidates,setCandidates]=useState<Candidate[]>([]);
 const [progressData,setProgressData]=useState<ProgressData>({targets:[],phases:[],focus:[]});const [progressError,setProgressError]=useState('');const [progressState,setProgressState]=useState<'loading'|'ready'|'unavailable'>('loading');const [syncState,setSyncState]=useState<'connecting'|'ready'|'partial'|'error'>('connecting');const [repoName,setRepoName]=useState('');
 const [repoLinks,setRepoLinks]=useState<RepoLink[]>([]),[repoLinksError,setRepoLinksError]=useState(''),[repoLinksPartial,setRepoLinksPartial]=useState(false);
 const [candidateTargets,setCandidateTargets]=useState<Record<string,string>>({});
 const [tab,setTab]=useState<'command'|'portfolio'|'review'|'progress'|'evidence'|'insights'|'operations'>('command');const [query,setQuery]=useState('');const [sort,setSort]=useState('manual');const [life,setLife]=useState('all');
 const dialogRef=useRef<HTMLElement|null>(null);const focusReturnRef=useRef<HTMLElement|null>(null);
 const [selected,setSelected]=useState<string|null>(null);const [newTitle,setNewTitle]=useState('');const [form,setForm]=useState<Partial<Project>>({});const [jsonImport,setJsonImport]=useState('');const [loading,setLoading]=useState(true);const [notice,setNotice]=useState('');const [error,setError]=useState('');
 const refresh=useCallback(async()=>{
  setSyncState('connecting');
  try{
   const [p,f,c]=await Promise.all([api<{items:Project[]}>('/api/projects'),api<Focus>('/api/focus'),api<{items:Candidate[]}>('/api/candidates')]);
   setRows(p.items);setFocus(f);setCandidates(c.items);
   const [links,progress]=await Promise.allSettled([
    api<{links:RepoLink[];partial:boolean}>('/api/portfolio/repositories'),
    api<ProgressData>('/api/progress')
   ]);
   if(links.status==='fulfilled'){setRepoLinks(links.value.links);setRepoLinksPartial(links.value.partial);setRepoLinksError('');}
   else{setRepoLinks([]);setRepoLinksPartial(false);setRepoLinksError('Linked repositories unavailable. Retry when connected.');}
   if(progress.status==='fulfilled'){setProgressData(progress.value);setProgressState('ready');setProgressError('');}
   else{setProgressData({targets:[],phases:[],focus:[]});setProgressState('unavailable');setProgressError('Progress and phase evidence unavailable. Manually selected focus remains visible but its phase cannot be checked.');}
   setSyncState(links.status==='fulfilled'&&progress.status==='fulfilled'?'ready':'partial');
  }catch(e){setSyncState('error');setProgressState('unavailable');throw e;}
 },[]);
 useEffect(()=>{refresh().catch(e=>setError(e.message)).finally(()=>setLoading(false));},[refresh]);
 useEffect(()=>{if(!selected||!dialogRef.current)return;return installDialogFocusTrap(dialogRef.current,()=>setSelected(null),focusReturnRef.current);},[selected]);
 const chosen=rows.find(x=>x.id===selected)||null;const activeIds=focus.items.map(x=>x.project_id);
 const command=useMemo(()=>progressState==='ready'?commandSnapshot(rows,progressData.targets,progressData.phases,focus.items):focusWhenProgressUnavailable(rows,focus.items),[rows,progressData,focus.items,progressState]);
 const ordered=useMemo(()=>[...rows].filter(p=>life==='all'||p.lifecycle===life).filter(p=>(p.title+' '+(p.next_action||'')+' '+(p.category||'')).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>{
 if(sort==='title')return a.title.localeCompare(b.title);if(sort==='deadline')return(a.deadline_date||'9999').localeCompare(b.deadline_date||'9999')||(a.manual_rank||0)-(b.manual_rank||0);
 if(sort==='priority')return(ps.indexOf(a.priority||'')<0?99:ps.indexOf(a.priority||''))-(ps.indexOf(b.priority||'')<0?99:ps.indexOf(b.priority||''))||(a.manual_rank||0)-(b.manual_rank||0);
 return (a.manual_rank||0)-(b.manual_rank||0);
 }),[rows,sort,life,query]);
 async function execute(task:()=>Promise<unknown>,success='Saved'){setError('');setNotice('');try{await task();await refresh();setNotice(success);}catch(e){setError(e instanceof Error?e.message:'Operation failed');}}
 const update=(item:Project,payload:Record<string,unknown>)=>execute(()=>api(`/api/projects/${item.id}`,{method:'PATCH',headers:{'If-Match':String(item.version)},body:JSON.stringify(payload)}));
 const add=()=>execute(async()=>{const title=newTitle.trim();if(!title)throw Error('Title required');const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug)throw Error('Name must contain Latin letters or digits');await api('/api/projects',{method:'POST',body:JSON.stringify({title,slug,lifecycle:'inbox'})});setNewTitle('');},'Project added to inbox');
 const focusSet=(ids:string[])=>execute(()=>api('/api/focus',{method:'PUT',body:JSON.stringify({project_ids:ids})}),'Weekly focus updated');
 const toggleFocus=(id:string)=>{if(activeIds.includes(id))focusSet(activeIds.filter(x=>x!==id));else if(activeIds.length>=3)setError('Three focus slots are occupied. Remove one project first.');else focusSet([...activeIds,id]);};
 const move=(id:string,direction:number)=>execute(()=>api(`/api/projects/${id}/rank`,{method:'POST',body:JSON.stringify({direction})}),'Manual rank updated');
 const saveDetail=()=>{if(!chosen)return;const payload:Record<string,unknown>={};for(const key of ['title','summary','category','lifecycle','priority','deadline_date','deadline_kind','next_action'] as const)if(form[key]!==undefined && form[key]!==chosen[key])payload[key]=form[key]; if(!Object.keys(payload).length)return setNotice('No changes');update(chosen,payload);};
 const edit=(p:Project)=>{focusReturnRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setSelected(p.id);setForm({...p});setError('');};
 const importCandidates=()=>execute(async()=>{const parsed=JSON.parse(jsonImport);const list=Array.isArray(parsed)?parsed:parsed.items;await api('/api/candidates',{method:'POST',body:JSON.stringify({items:list})});setJsonImport('');},'Candidates added for review');
 const review=(c:Candidate,action:'dismiss'|'link')=>execute(()=>api(`/api/candidates/${c.id}`,{method:'PATCH',body:JSON.stringify({action,projectId:action==='link'?candidateTargets[c.id]:undefined})}),'Review recorded');
 const addRepo=()=>execute(async()=>{await api('/api/candidates/resolve',{method:'POST',body:JSON.stringify({repository:repoName})});setRepoName('');},'Repository added to review queue');
 const completed=rows.filter(x=>x.lifecycle==='completed').length;
 return <div className="shell"><a className="skip-control" href="#control-content">Skip to main content</a>
  <aside className="sidebar"><div className="brand"><span className="brand-icon">C/</span><div><strong>THIEPN</strong><span>CONTROL SYSTEM</span></div></div>
   <div className="side-caption">WORKSPACE</div>
   <nav aria-label="Main navigation"><button aria-current={tab==='command'?'page':undefined} onClick={()=>setTab('command')}>01 <span>Command</span></button><button aria-current={tab==='portfolio'?'page':undefined} onClick={()=>setTab('portfolio')}>02 <span>Portfolio</span></button><button aria-current={tab==='review'?'page':undefined} onClick={()=>setTab('review')}>03 <span>Import review</span><em>{candidates.filter(c=>c.review_status==='pending').length}</em></button><button aria-current={tab==='progress'?'page':undefined} onClick={()=>setTab('progress')}>04 <span>Progress</span></button><button aria-current={tab==='evidence'?'page':undefined} onClick={()=>setTab('evidence')}>05 <span>GitHub</span></button><button aria-current={tab==='insights'?'page':undefined} onClick={()=>setTab('insights')}>06 <span>Priorities</span></button><button aria-current={tab==='operations'?'page':undefined} onClick={()=>setTab('operations')}>07 <span>Review</span></button></nav>
   <div className="side-bottom"><div>FOCUS IS FINITE</div><b>{activeIds.length} / 3 SLOTS USED</b><button className="signout" onClick={()=>browserClient().auth.signOut().then(()=>location.reload())}>Sign out ↗</button></div>
  </aside>
  <div className="main"><header className="topline"><span>PERSONAL PROJECT OPERATIONS</span><span role="status">PRIVATE · {syncState==='connecting'?'CONNECTING':syncState==='ready'?'CONNECTED':syncState==='partial'?'PARTIAL DATA':'CONNECTION FAILED'}</span></header>
   <main id="control-content" tabIndex={-1}><div className="pagehead"><div><div className="overline">{tab.toUpperCase()} / {new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div><h1>{tab==='command'?'Make progress.':tab==='portfolio'?'Every project.':tab==='progress'?'Measure real progress.':tab==='evidence'?'Review GitHub evidence.':tab==='insights'?'Decide what matters next.':tab==='operations'?'Review your portfolio.':'Review imports.'}</h1><p>{tab==='command'?'Select the work that actually matters.':tab==='portfolio'?'Complete control, without invented completion figures.':tab==='progress'?'Weighted milestones, phases and weekly commitments.':tab==='evidence'?'Signed events, exact commits, and auditable decisions.':tab==='insights'?'Transparent scores, focus capacity and reviewed decisions.':tab==='operations'?'Weekly reflection, activity provenance and integration health.':'Import deliberately. Nothing becomes active automatically.'}</p></div><div className="head-stat"><strong>{rows.length}</strong><span>REGISTERED PROJECTS</span></div></div>
   {notice&&<p role="status" className="status success">{notice}</p>}{error&&<p role="alert" className="status failure">{error}</p>}{progressError&&<p role="status" className="status failure">{progressError}</p>}{repoLinksError&&<p role="status" className="status failure">{repoLinksError}</p>}
   {(syncState==='partial'||syncState==='error')&&<button className="mini-action" onClick={()=>refresh().then(()=>setError('')).catch(e=>setError(e instanceof Error?e.message:'Refresh failed'))}>Retry connection</button>}
   {tab==='command'&&<><div className="section-label"><strong>NEXT ACTION</strong><button onClick={()=>setTab('insights')}>See priority reasoning ↗</button></div>
    <section className="command-next" aria-label="Recommended next action">
     {command?.next?<><div><div className="overline">{command.next.source==='weekly_focus'?'YOUR WEEKLY FOCUS':command.next.source==='focus_unverified'?'YOUR RECORDED FOCUS · PHASE UNAVAILABLE':'RULE-BASED SUGGESTION · REVIEW BEFORE ACCEPTING'}</div><h2>{command.next.project.title}</h2>
      <p>{command.next.action||'No next action recorded. Define one before starting.'}</p>
      <small>{progressState==='ready'?(command.summary.get(command.next.project.id)?.phase?.key||'No phase'):'Phase unavailable'} · {command.next.project.priority||'Priority unset'} · {progressState!=='ready'?'Progress unavailable':command.summary.get(command.next.project.id)?.progress.reported===null?'Progress unassessed':command.summary.get(command.next.project.id)?.progress.reported+'% reported'}</small></div>
      <button className="submit" onClick={()=>{if(command?.next)edit(command.next.project);}}>Open project ↗</button></>
     :<><div><div className="overline">CHOICE REQUIRED</div><h2>{progressState!=='ready'?'Choose a recorded focus':'Choose your next action'}</h2><p>{progressState!=='ready'?'Milestone and phase data are unavailable. Select a project from your recorded portfolio; no automated recommendation will be inferred.':'Set a weekly focus and enter its next actionable task. Nothing is invented.'}</p></div><button className="submit" onClick={()=>setTab('portfolio')}>Open portfolio ↗</button></>}
    </section>
    <div className="section-label"><strong>THIS WEEK'S FOCUS</strong><span>{focus.week||'Current week'} · MAXIMUM THREE</span></div><div className="focus-grid">{Array.from({length:3},(_,i)=>{const x=focus.items.find(f=>f.slot===i+1);const p=rows.find(r=>r.id===x?.project_id);return <section className="focus-slot" key={i}><div className="slot-mark">0{i+1}<span>{i===0?'PRIMARY':i===1?'SECONDARY':'CLOSURE'}</span></div>{p?<><h2>{p.title}</h2><p>{p.next_action||'Define the next action.'}</p><div className="slot-foot"><span>{p.priority||'Unprioritized'} · {progressState!=='ready'?'Progress unavailable':command?.summary.get(p.id)?.progress.reported===null?'Unassessed':command?.summary.get(p.id)?.progress.reported+'% reported'}</span><button onClick={()=>toggleFocus(p.id)}>Remove ↗</button></div></>:<><h2>Unassigned</h2><p>Choose one project from the portfolio.</p><div className="slot-foot"><span>EMPTY SLOT</span></div></>}</section>;})}</div>
   <div className="summary-line"><span><strong>{rows.filter(p=>p.lifecycle==='active').length}</strong> Active</span><span><strong>{rows.filter(p=>p.lifecycle==='waiting').length}</strong> Waiting</span><span><strong>{completed}</strong> Completed</span><span><strong>{rows.length-activeIds.length}</strong> Outside focus</span></div>
   <div className="section-label"><strong>READY FOR TRIAGE</strong><button onClick={()=>setTab('portfolio')}>Open portfolio ↗</button></div>
   {rows.filter(p=>p.lifecycle==='inbox').slice(0,6).map(p=><button key={p.id} className="triage-item" onClick={()=>{edit(p);setTab('portfolio');}}><span>{p.title}</span><span>NOT YET ASSESSED ↗</span></button>)}
   {!rows.length&&!loading&&<p className="empty">Your portfolio is empty. Add the first project in Portfolio, or review imports.</p>}</>}
   {tab==='portfolio'&&<><div className="portfolio-tools"><div className="search-field"><label htmlFor="project-search">SEARCH</label><input id="project-search" placeholder="Project name or next action…" value={query} onChange={e=>setQuery(e.target.value)}/></div><label>STATE<select aria-label="Filter project lifecycle" value={life} onChange={e=>setLife(e.target.value)}><option value="all">All states</option>{states.map(s=><option key={s} value={s}>{s}</option>)}</select></label><label>SORT BY<select aria-label="Sort projects" value={sort} onChange={e=>setSort(e.target.value)}><option value="manual">Manual order</option><option value="priority">Priority</option><option value="deadline">Deadline</option><option value="title">Title</option></select></label></div>
   <form className="quick-add" onSubmit={e=>{e.preventDefault();add();}}><label htmlFor="new-project">NEW PROJECT</label><input id="new-project" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Name a project…" required/><button type="submit">Add to inbox +</button></form>
   <div className="table-wrap"><table><thead><tr><th scope="col">PROJECT</th><th scope="col">PRIORITY</th><th scope="col">STATE</th><th scope="col">PHASE</th><th scope="col">PROGRESS</th><th scope="col">DEADLINE</th><th scope="col">FOCUS</th><th scope="col">ORDER</th></tr></thead><tbody>{ordered.map(p=><tr key={p.id}><td><button className="project-link" onClick={()=>edit(p)}>{p.title} <span>↗</span></button><small>{p.next_action||'No next action recorded'}</small></td><td><select aria-label={`Priority for ${p.title}`} value={p.priority||''} onChange={e=>update(p,{priority:e.target.value||null})}><option value="">—</option>{ps.map(x=><option key={x}>{x}</option>)}</select></td><td><select aria-label={`State for ${p.title}`} value={p.lifecycle} onChange={e=>update(p,{lifecycle:e.target.value})}>{states.map(x=><option key={x}>{x}</option>)}</select></td><td><span className="unassessed">{progressState!=='ready'?'Unavailable':command?.summary.get(p.id)?.phase?.key||'Not recorded'}</span></td><td><span className="unassessed">{progressState!=='ready'?'Unavailable':command?.summary.get(p.id)?.progress.reported===null?'Unassessed':command?.summary.get(p.id)?.progress.reported+'% reported'}</span>{progressState==='ready'&&command?.summary.get(p.id)?.progress.verified!==null&&<small>{command?.summary.get(p.id)?.progress.verified}% verified</small>}</td><td>{p.deadline_date?<time dateTime={p.deadline_date}>{p.deadline_date}</time>:<span className="subtle">—</span>}</td><td><button className="mini-action" aria-label={`${activeIds.includes(p.id)?'Remove from':'Add to'} weekly focus: ${p.title}`} aria-pressed={activeIds.includes(p.id)} onClick={()=>toggleFocus(p.id)}>{activeIds.includes(p.id)?'IN FOCUS':'ADD +'}</button></td><td><div className="rank-actions"><button disabled={sort!=='manual'} onClick={()=>move(p.id,-1)} aria-label={`Move ${p.title} up`}>↑</button><button disabled={sort!=='manual'} onClick={()=>move(p.id,1)} aria-label={`Move ${p.title} down`}>↓</button></div></td></tr>)}</tbody></table></div><div className="table-footer">{ordered.length} RESULTS · Reported progress comes from weighted milestones; verified progress is shown separately.</div></>}
   {tab==='progress'&&<ProgressWorkspace projects={rows} onChange={refresh}/>}
   {tab==='evidence'&&<EvidenceWorkspace projects={rows}/>}
   {tab==='insights'&&<RecommendationsWorkspace/>}
   {tab==='operations'&&<OperationsWorkspace projects={rows}/>}
   {tab==='review'&&<><RepositoryDiscovery onImported={refresh} knownIds={candidates.map(c=>c.github_repository_id)}/><div className="section-label"><strong>ADD ONE GITHUB REPOSITORY</strong><span>Review before linking</span></div>
    <form className="quick-add" onSubmit={e=>{e.preventDefault();addRepo();}}>
      <label htmlFor="new-repo">REPOSITORY</label><input id="new-repo" value={repoName} onChange={e=>setRepoName(e.target.value)} placeholder="owner/repo or https://github.com/owner/repo" required/>
      <button type="submit">Add for review +</button>
    </form><p className="note">Public repositories can be resolved by GitHub. Private repositories require an authorized GitHub App installation. A repository is never activated automatically.</p>
    <details><summary>Advanced: import repository candidates as JSON</summary><div className="review-intro">Import a JSON array of <code>{'{"full_name":"owner/repo","github_repository_id":123}'}</code> records. Every imported record remains pending until explicitly linked or dismissed.</div><label className="block-label" htmlFor="import-json">REPOSITORY CANDIDATES JSON</label><textarea id="import-json" rows={5} value={jsonImport} placeholder='[{"full_name":"owner/repository","github_repository_id":123}]' onChange={e=>setJsonImport(e.target.value)}/><button className="submit" disabled={!jsonImport.trim()} onClick={importCandidates}>Validate and import candidates →</button></details><div className="section-label"><strong>REPOSITORY REVIEW & PROJECT GROUPING</strong><span>{candidates.filter(x=>x.review_status==='pending').length} PENDING</span></div>
    <form className="quick-add" onSubmit={e=>{e.preventDefault();add();}}>
     <label htmlFor="review-new-project">CREATE PROJECT</label><input id="review-new-project" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="One product, not necessarily one repository…" required maxLength={160}/>
     <button type="submit">Create project in inbox</button>
    </form>
    <p className="note">Creates an explicitly named, unassessed inbox project; it does not automatically link any repositories or invent deadlines, priorities, phases or progress.</p>
    <p className="note">Select a destination for each repository individually. Multiple repositories may belong to one product, but one repository cannot belong to two products. Projects must be created deliberately in Portfolio.</p>
    {candidates.filter(c=>c.review_status==='pending').map(c=><div className="candidate" key={c.id}>
     <div><b>{c.full_name}</b><small>Pending · GitHub ID {c.github_repository_id}</small></div>
     <div className="candidate-actions">
      <label>Destination project<select aria-label={'Destination project for '+c.full_name} value={candidateTargets[c.id]||''}
        onChange={e=>setCandidateTargets(prev=>({...prev,[c.id]:e.target.value}))}>
       <option value="">Choose project…</option>{rows.filter(p=>p.lifecycle!=='archived').map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
      </select></label>
      <button onClick={()=>review(c,'dismiss')}>Dismiss</button>
      <button disabled={!candidateTargets[c.id]} onClick={()=>review(c,'link')}>Link repository</button>
     </div>
    </div>)}
    {candidates.filter(c=>c.review_status!=='pending').length>0&&<details className="review-history"><summary>Reviewed repositories ({candidates.filter(c=>c.review_status!=='pending').length})</summary>
    {candidates.filter(c=>c.review_status!=='pending').map(c=><div className="candidate" key={c.id}><b>{c.full_name}</b><small>{c.review_status}{c.project_id?' · '+(rows.find(p=>p.id===c.project_id)?.title||'Linked project unavailable'):''}</small></div>)}</details>}
    <p className="note">Import review never updates lifecycle, milestones or progress. Project-to-repository links are stored under your authenticated owner only.</p></>}
   </main></div>
   {chosen&&<div className="sheet-overlay" onClick={()=>setSelected(null)}><section className="detail-sheet" ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`Edit ${chosen.title}`} onClick={e=>e.stopPropagation()}><div className="sheet-top"><span>PROJECT / {chosen.slug}</span><button onClick={()=>setSelected(null)} aria-label="Close detail panel">✕</button></div><h2>{chosen.title}</h2><p>{progressState!=='ready'?'Progress unavailable':command?.summary.get(chosen.id)?.progress.reported===null?'Milestone completion unassessed':command?.summary.get(chosen.id)?.progress.reported+'% reported · '+command?.summary.get(chosen.id)?.progress.verified+'% verified'} · {progressState!=='ready'?'Phase unavailable':command?.summary.get(chosen.id)?.phase?.key||'No recorded phase'}. Edit manual project properties below.</p><form onSubmit={e=>{e.preventDefault();saveDetail();}}>
   <label>Project name<input required value={form.title||''} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>Summary<textarea value={form.summary||''} rows={3} onChange={e=>setForm({...form,summary:e.target.value})}/></label>
   <label>Category<input value={form.category||''} onChange={e=>setForm({...form,category:e.target.value})}/></label>
   <label>Next actionable step<textarea rows={2} value={form.next_action||''} onChange={e=>setForm({...form,next_action:e.target.value})}/></label>
   <div className="detail-two"><label>Priority<select value={form.priority||''} onChange={e=>setForm({...form,priority:e.target.value||null})}><option value="">Unassigned</option>{ps.map(x=><option key={x}>{x}</option>)}</select></label><label>Lifecycle<select value={form.lifecycle||'inbox'} onChange={e=>setForm({...form,lifecycle:e.target.value})}>{states.map(x=><option key={x}>{x}</option>)}</select></label></div>
   <div className="detail-two"><label>Deadline<input type="date" value={form.deadline_date||''} onChange={e=>setForm({...form,deadline_date:e.target.value||null,deadline_kind:e.target.value?(form.deadline_kind||'target'):null})}/></label><label>Deadline type<select value={form.deadline_kind||''} onChange={e=>setForm({...form,deadline_kind:e.target.value||null,deadline_date:e.target.value?(form.deadline_date||null):null})}><option value="">None</option><option value="target">Target</option><option value="hard">Hard</option></select></label></div>
   <button type="submit" className="submit">Save changes →</button></form>
   <section className="project-repos" aria-label="Linked GitHub repositories"><h3>Linked repositories</h3>
    {repoLinksError?<p>{repoLinksError}</p>:repoLinks.filter(link=>link.project_id===chosen.id).length===0?<p>No repositories linked yet. Review them in Import review.</p>:
     <ul>{repoLinks.filter(link=>link.project_id===chosen.id).map((link,i)=><li key={i}>{link.full_name?<a href={'https://github.com/'+link.full_name} target="_blank" rel="noreferrer">{link.full_name}</a>:'Repository identity unavailable'} <small>{link.link_role}</small></li>)}</ul>}
    {repoLinksPartial&&<p>Only the first 500 repository links are shown.</p>}
   </section>
   <button className="archive" onClick={()=>{if(confirm(`Archive ${chosen.title}?`)){update(chosen,{lifecycle:'archived'});setSelected(null);}}}>Archive project</button><p className="revision">Revision {chosen.version} · Optimistic concurrency protected</p></section></div>}
  </div>;
}
