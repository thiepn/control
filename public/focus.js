// Source-linked, qualitative R4 decisions. Never infer completion percentages or deadlines.
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function githubLink(s){try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='github.com'&&u.username===''&&u.password===''?u.href:null}catch{return null}}
export const laneLabels={act_now:'ACT NOW',prepare:'PREPARE / VERIFY',waiting:'AWAIT EXTERNAL EVIDENCE'};
const slug=s=>{const v=String(s||'').split('/').pop();return /^[\w.-]{1,100}$/.test(v)?v:null};
export function normalizeFocus(items,projects){
 const allowed=new Map((Array.isArray(projects)?projects:[]).filter(p=>githubLink(p.repo_url)).map(p=>[p.repo_url,p]));
 const seenRank=new Set(),seenRepo=new Set(),valid=[];
 if(!Array.isArray(items))return valid;
 for(const x of items){if(!x||!Number.isInteger(x.rank)||x.rank<1||x.rank>5||seenRank.has(x.rank)||seenRepo.has(x.repo_url)||!allowed.has(x.repo_url)||!Object.hasOwn(laneLabels,x.lane)||!githubLink(x.evidence_url))continue;
   seenRank.add(x.rank);seenRepo.add(x.repo_url);
   const project=allowed.get(x.repo_url);
   const hasDeadline=typeof x.deadline_date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.deadline_date)&&!Number.isNaN(Date.parse(x.deadline_date+'T00:00:00Z'))&&githubLink(x.deadline_evidence_url);
   valid.push({...x,project,deadline_date:hasDeadline?x.deadline_date:null,deadline_evidence_url:hasDeadline?x.deadline_evidence_url:null});
 }
 return valid.sort((a,b)=>a.rank-b.rank).slice(0,5);
}
export function focusByLane(items){return {act_now:items.filter(x=>x.lane==='act_now'),prepare:items.filter(x=>x.lane==='prepare'),waiting:items.filter(x=>x.lane==='waiting')}}
export function verifiedDeadline(item){return item.deadline_date&&item.deadline_evidence_url?'Deadline: '+item.deadline_date:'No verified deadline'}
const external=(s,label)=>{const href=githubLink(s);return href?'<a class="focus-source" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>':''};
export function renderFocusCard(item){
 const p=item.project,repo=slug(p.repo_url),href=repo?'#project/'+encodeURIComponent(repo):'#portfolio';
 const dependency=item.dependency_note&&githubLink(item.dependency_url)?'<div class="focus-dependency"><span class="focus-field">KNOWN PREREQUISITE</span><p>'+esc(item.dependency_note)+'</p>'+external(item.dependency_url,'Inspect prerequisite ↗')+'</div>':'';
 const deadline=item.deadline_date&&item.deadline_evidence_url?external(item.deadline_evidence_url,'Verify deadline ↗'):'<span>No verified deadline</span>';
 return '<article class="focus-decision" data-lane="'+esc(item.lane)+'"><div class="focus-rank">'+String(item.rank).padStart(2,'0')+'</div><div class="focus-decision-body"><div class="focus-card-top"><span class="overline">'+esc(laneLabels[item.lane])+'</span><span class="focus-owner-tier">Owner tier '+esc(p.priority||'Unassigned')+'</span></div><h3>'+esc(p.title)+'</h3><div class="focus-headline">'+esc(item.headline)+'</div><div class="focus-field">WHY THIS IS IN FOCUS</div><p class="focus-why">'+esc(item.rationale)+'</p><div class="focus-next"><span class="focus-field">NEXT PRACTICAL MOVE</span><p>'+esc(item.next_action)+'</p></div><div class="focus-constraint"><span class="focus-field">WHAT STILL BLOCKS RELEASE</span><p>'+esc(item.constraint_note)+'</p></div>'+dependency+'<div class="focus-card-foot"><span class="focus-deadline">'+deadline+'</span><span class="focus-confidence">'+esc(item.confidence)+' confidence</span>'+external(item.evidence_url,'Source evidence ↗')+'<a class="brief-link" href="'+esc(href)+'">Project briefing →</a></div></div></article>';
}
