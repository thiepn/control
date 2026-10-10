'use client';
import {useState} from 'react';
type Repo={id:number;full_name:string;visibility:string;archived:boolean};
type Page={owner:string;source:string;page:number;items:Repo[];hasNext:boolean};
export default function RepositoryDiscovery({onImported,knownIds=[]}:{onImported:()=>Promise<void>;knownIds:number[]}){
 const [owner,setOwner]=useState(''),[source,setSource]=useState('public'),[page,setPage]=useState<Page|null>(null);
 const [selected,setSelected]=useState<number[]>([]),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const known=new Set(knownIds);
 const get=async(p=1)=>{
  setBusy(true);setNotice('');setSelected([]);
  try{
   const url='/api/candidates/discover?owner='+encodeURIComponent(owner.trim())+'&source='+source+'&page='+p;
   const response=await fetch(url,{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Discovery failed');
   setPage(data as Page);
  }catch(e){setPage(null);setNotice(e instanceof Error?e.message:'Discovery failed');}
  finally{setBusy(false);}
 };
 const toggle=(id:number)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 const submit=async()=>{
  if(!page||selected.length===0)return;
  setBusy(true);setNotice('');
  try{
   const response=await fetch('/api/candidates/discover',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({owner:page.owner,source:page.source,page:page.page,ids:selected})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Import failed');
   setNotice(data.submitted+' repository candidates submitted for review. Previously recorded candidates may be ignored.');
   setSelected([]);await onImported();
  }catch(e){setNotice(e instanceof Error?e.message:'Import failed');}
  finally{setBusy(false);}
 };
 const eligible=page?.items.filter(r=>!known.has(r.id))||[];
 return <section className="discovery" aria-label="Discover GitHub repositories">
  <div className="section-label"><strong>DISCOVER REPOSITORIES</strong><span>Read-only preview → explicit intake</span></div>
  <form className="discovery-controls" onSubmit={e=>{e.preventDefault();get(1);}}>
   <label>GITHUB OWNER<input aria-label="GitHub account or organization" required value={owner} onChange={e=>{setOwner(e.target.value);setPage(null);setSelected([]);}} placeholder="thiepn or newmedu"/></label>
   <label>SOURCE<select aria-label="Repository visibility source" value={source} onChange={e=>{setSource(e.target.value);setPage(null);setSelected([]);}}>
    <option value="public">Public repositories</option><option value="installation">Authorized GitHub App repositories</option></select></label>
   <button type="submit" disabled={busy||!owner.trim()}>Find repositories</button>
  </form>
  <p className="note">No project states, completion percentages or priorities are inferred from GitHub. Installation mode requires an existing authorized GitHub App. Repositories are private to your signed-in Control account after review.</p>
  {notice&&<p role="status" className="note">{notice}</p>}
  {page&&<><div className="discovery-toolbar"><strong>{page.items.length} results · page {page.page}</strong>
    <button type="button" disabled={busy||eligible.length===0} onClick={()=>setSelected(eligible.map(r=>r.id))}>Select new on page</button>
    <button type="button" disabled={busy||selected.length===0} onClick={submit}>Add {selected.length} to review</button></div>
    <div className="discovery-list">
    {page.items.map(r=><label key={r.id} className="discovery-item">
     <input type="checkbox" checked={selected.includes(r.id)} disabled={busy||known.has(r.id)} onChange={()=>toggle(r.id)}/>
     <span><strong>{r.full_name}</strong><small>{r.visibility} · {r.archived?'Archived on GitHub, lifecycle unassessed':'Lifecycle unassessed'}{known.has(r.id)?' · Already in review history':''}</small></span>
    </label>)}
    </div>
    {!page.items.length&&<p className="empty">No accessible repositories on this page.</p>}
    <div className="discovery-toolbar"><button disabled={busy||page.page<=1} onClick={()=>get(page.page-1)}>Previous page</button>
     <button disabled={busy||!page.hasNext||page.page>=10} onClick={()=>get(page.page+1)}>Next page</button></div>
   </>}
 </section>;
}
