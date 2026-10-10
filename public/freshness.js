// Client-side read-only freshness interpretation; no credentials or background polling.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseDate(s){if(typeof s!=='string'||!s)return null;const d=new Date(s.includes('T')?s:s.replace(' ','T')+'Z');return Number.isFinite(d.getTime())?d:null}
export function freshness(project,observation,now=Date.now()){
 if(!observation)return'untracked';
 const d=parseDate(observation.last_checked_at);if(!d)return'unknown';
 const maxDays=['P0','P1'].includes(project?.priority)?7:30;
 return now-d.getTime()>maxDays*86400000?'stale':'current';
}
export function metrics(projects,observations,now=Date.now()){
 const map=new Map((observations||[]).map(o=>[o.repo_url,o]));
 const out={total:projects.length,current:0,stale:0,untracked:0,unknown:0,tracked:0};
 for(const p of projects){const n=freshness(p,map.get(p.repo_url),now);out[n]++;if(map.has(p.repo_url))out.tracked++}return out;
}
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'&&x.hostname==='github.com'?x.href:null}catch{return null}};
export function statusLabel(r){return !r?'No refresh run recorded':r.status==='succeeded'?'Refresh succeeded':r.status==='partial'?'Refresh partially completed':r.status==='failed'?'Refresh failed':'Refresh in progress'}
export function renderRefresh({runs=[],observations=[],events=[]},projects=[],now=Date.now()){
 const m=metrics(projects,observations,now),r=runs[0];
 let x='<div class="refresh-top"><div><span class="overline">LAST RECORDED REVIEW</span><strong>'+esc(statusLabel(r))+'</strong><p>'+esc(r?.finished_at||r?.started_at||'No runs yet')+' · '+esc(r?.kind||'Awaiting first run')+'</p><small>'+esc(r?.checked_count??0)+' sources inspected in this run</small></div><div class="refresh-counts"><span><strong>'+m.tracked+'</strong>Tracked</span><span><strong>'+m.untracked+'</strong>Not yet tracked</span><span><strong>'+m.stale+'</strong>Overdue</span></div></div>';
 x+='<div class="refresh-activity"><div class="overline">SOURCE-BOUND CHANGE LOG</div>';
 if(!events.length)return x+'<p class="supporting">No recorded source or review changes yet.</p></div>';
 return x+events.slice(0,12).map(y=>'<div class="refresh-event"><div><strong>'+esc(y.entity_type)+' · '+esc(y.action)+'</strong><p>'+esc(y.repo_url?.split('/').pop()||'unknown')+' · '+esc(y.created_at||'')+'</p></div>'+(safe(y.evidence_url)?'<a class="evidence" href="'+esc(safe(y.evidence_url))+'" target="_blank" rel="noopener noreferrer">Source ↗</a>':'')+'</div>').join('')+'</div>';
}
