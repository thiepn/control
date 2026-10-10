const $=id=>document.getElementById(id);
let projects=[],loading=false,editing=null;
const statusNames={planned:'Planned',active:'Active',paused:'Paused',completed:'Completed'};
function el(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function notice(message,success=false){const n=$('message');n.textContent=message;n.className='message'+(success?' success':'');n.hidden=false;}
function clearNotice(){$('message').hidden=true;}
async function api(path,options){
 const res=await fetch(path,{cache:'no-store',...options,headers:{...(options?.body?{'Content-Type':'application/json'}:{}),...options?.headers}});
 let data;try{data=await res.json();}catch{throw Error('Invalid server response');}
 if(!res.ok)throw Error(data.error||'Request failed ('+res.status+')');
 return data;
}
function priorityIndex(value){return ['P0','P1','P2','P3'].indexOf(value)<0?4:['P0','P1','P2','P3'].indexOf(value);}
function shown(){
 const q=$('search').value.trim().toLowerCase(),p=$('priorityFilter').value,s=$('statusFilter').value,sort=$('sort').value;
 const rows=projects.filter(x=>{
  if(p&&(p==='unassigned'?x.priority!==null:x.priority!==p))return false;
  if(s&&x.status!==s)return false;
  return !q||[x.title,x.next_action,x.repo_url,x.notes].some(v=>String(v||'').toLowerCase().includes(q));
 });
 rows.sort((a,b)=>sort==='name'?a.title.localeCompare(b.title):sort==='progress'?(b.progress??-1)-(a.progress??-1)||a.title.localeCompare(b.title):sort==='updated'?String(b.updated_at||'').localeCompare(String(a.updated_at||'')):priorityIndex(a.priority)-priorityIndex(b.priority)||a.title.localeCompare(b.title));
 return rows;
}
function render(){
 $('totalCount').textContent=String(projects.length);
 $('activeCount').textContent=String(projects.filter(p=>p.status==='active').length);
 $('completeCount').textContent=String(projects.filter(p=>p.status==='completed').length);
 const assessed=projects.filter(p=>p.progress!==null&&Number.isInteger(p.progress));
 $('averageProgress').textContent=assessed.length?Math.round(assessed.reduce((sum,p)=>sum+p.progress,0)/assessed.length)+'%':'—';
 const rows=shown();$('listCount').textContent=rows.length;
 const list=$('list');list.replaceChildren();
 for(const p of rows){
  const article=el('article','project-card');
  const main=el('div','card-main'),mark=el('span','project-initial',(p.title||'?').slice(0,1).toUpperCase()),texts=el('div');
  texts.style.minWidth='0';texts.append(el('span','project-name',p.title));
  if(p.repo_url){const a=el('a','repo-link',p.repo_url.replace('https://github.com/',''));a.href=p.repo_url;a.target='_blank';a.rel='noopener noreferrer';texts.append(a);}
  else texts.append(el('span','muted','No repository linked'));
  main.append(mark,texts);
  const pri=el('div'),tag=el('span','priority '+(p.priority||'none'),p.priority||'—');pri.append(tag);
  const prog=el('div','card-progress');
  if(p.progress==null)prog.append(el('span','progress-unassessed','Not assessed'));
  else{
   const top=el('div','progress-top'),label=el('span','', 'COMPLETION'),v=el('span','progress-value',p.progress+'%');top.append(label,v);
   const bar=el('div','bar'),inside=el('div','bar-inner');inside.style.width=p.progress+'%';bar.append(inside);prog.append(top,bar);
  }
  const next=el('div','card-next');next.append(el('span','action-label','NEXT ACTION'),el('span','next-action',p.next_action||'Not specified'));
  const status=el('div','card-status');status.append(el('span','status '+p.status,statusNames[p.status]||p.status));
  const buttons=el('div','card-actions'),edit=el('button','','✎'),del=el('button','danger','×');
  edit.type='button';edit.setAttribute('aria-label','Edit '+p.title);
  del.type='button';del.setAttribute('aria-label','Delete '+p.title);
  edit.addEventListener('click',()=>openEdit(p));del.addEventListener('click',()=>remove(p));
  buttons.append(edit,del);
  article.append(main,pri,prog,next,status,buttons);list.append(article);
 }
 const empty=$('empty');empty.hidden=rows.length!==0||loading;
 if(!empty.hidden){$('emptyTitle').textContent=projects.length?'No matching projects':'No projects yet';$('emptyBody').textContent=projects.length?'Adjust your search or filters.':'Create your first project or import repositories.';}
}
async function load(){
 if(loading)return;loading=true;try{const data=await api('/api/projects');if(!Array.isArray(data.items))throw Error('Invalid project list');projects=data.items;clearNotice();}catch(e){notice('Could not load saved projects: '+e.message+' — try refreshing.');}finally{loading=false;render();}
}
function openEdit(project=null){
 editing=project;$('editHeading').textContent=project?'Edit project':'New project';
 const form=$('projectForm');form.reset();
 for(const field of ['title','priority','status','next_action','repo_url','notes'])form.elements[field].value=project?.[field]??(field==='status'?'planned':'');
 form.elements.progress.value=project?.progress??'';
 $('formError').hidden=true;$('editDialog').showModal();form.elements.title.focus();
}
async function save(e){
 e.preventDefault();const form=$('projectForm'),button=$('saveBtn');$('formError').hidden=true;
 const d=new FormData(form),progress=String(d.get('progress')).trim();
 const data={title:d.get('title'),priority:d.get('priority')||null,progress:progress===''?null:Number(progress),status:d.get('status'),next_action:d.get('next_action')||null,repo_url:d.get('repo_url')||null,notes:d.get('notes')||null};
 if(editing)data.version=editing.version;
 button.disabled=true;
 try{
  await api(editing?'/api/projects/'+editing.id:'/api/projects',{method:editing?'PATCH':'POST',body:JSON.stringify(data)});
  $('editDialog').close();await load();notice(editing?'Project updated':'Project created',true);
 }catch(err){$('formError').textContent=err.message;$('formError').hidden=false;}
 finally{button.disabled=false;}
}
async function remove(project){
 if(!confirm('Delete "'+project.title+'"? This cannot be undone. Export a backup first if needed.'))return;
 try{await api('/api/projects/'+project.id,{method:'DELETE',body:JSON.stringify({version:project.version})});await load();notice('Project deleted',true);}catch(e){notice(e.message);}
}
async function importRepos(e){
 e.preventDefault();const form=$('importForm'),button=$('importSaveBtn');$('importError').hidden=true;
 const names=String(new FormData(form).get('repos')).split(/[\n,]+/).map(x=>x.trim().replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'')).filter(Boolean);
 button.disabled=true;try{
  const res=await api('/api/import',{method:'POST',body:JSON.stringify({names})});
  $('importDialog').close();form.reset();await load();notice(res.imported+' repositories added ('+(res.submitted-res.imported)+' already present).',true);
 }catch(error){$('importError').textContent=error.message;$('importError').hidden=false;}finally{button.disabled=false;}
}
async function backup(){
 const button=$('backupBtn');button.disabled=true;
 try{
  const data=await api('/api/backup');
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download='control-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  notice('Backup downloaded. Store it somewhere private.',true);
 }catch(e){notice('Backup failed: '+e.message);}finally{button.disabled=false;}
}
$('addBtn').addEventListener('click',()=>openEdit());
$('emptyAdd').addEventListener('click',()=>openEdit());
$('importBtn').addEventListener('click',()=>{$('importError').hidden=true;$('importDialog').showModal();});
$('backupBtn').addEventListener('click',backup);
$('projectForm').addEventListener('submit',save);
$('importForm').addEventListener('submit',importRepos);
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$((b.dataset.close)).close()));
for(const id of ['search','priorityFilter','statusFilter','sort'])$(id).addEventListener(id==='search'?'input':'change',render);
load();
