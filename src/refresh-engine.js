// R5 owner-controlled, compare-and-swap source/recommendation reconciler.
// Invoked by a connected review agent; never shipped to the browser.
const repoRe=/^https:\/\/github\.com\/thiepn\/[A-Za-z0-9_.-]{1,100}$/;
const shaRe=/^[a-f0-9]{40}$/i;
const text=(v,max=1500)=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw Error('Invalid text');return v.trim()};
const rev=x=>{if(!Number.isSafeInteger(x)||x<0||x>1e9)throw Error('Invalid expected revision');return x};
const runId=x=>{if(!/^[a-zA-Z0-9_.:-]{3,100}$/.test(x||''))throw Error('Invalid run ID');return x};
export const ownerRepo=s=>typeof s==='string'&&repoRe.test(s)&&!s.endsWith('/.')&&!s.endsWith('/..');
export function githubEvidence(u,repo){if(!ownerRepo(repo))return false;try{const x=new URL(u),r=new URL(repo);return x.protocol==='https:'&&x.hostname==='github.com'&&x.username===''&&x.password===''&&(x.pathname===r.pathname||x.pathname.startsWith(r.pathname+'/'))&&!x.search&&!x.hash}catch{return false}}
export function observationFingerprint(s){
 if(!githubEvidence(s?.source_url,s?.repo_url))throw Error('Invalid source');
 if(s.main_sha!=null&&!shaRe.test(s.main_sha))throw Error('Invalid commit SHA');
 if(s.latest_pr_head!=null&&!shaRe.test(s.latest_pr_head))throw Error('Invalid PR head');
 if(s.latest_pr_number!=null&&(!Number.isInteger(s.latest_pr_number)||s.latest_pr_number<1))throw Error('Invalid PR');
 if(s.latest_ci_id!=null&&(!Number.isSafeInteger(s.latest_ci_id)||s.latest_ci_id<1))throw Error('Invalid CI');
 return JSON.stringify([s.repo_url,s.default_branch||null,s.main_sha||null,s.latest_pr_number||null,s.latest_pr_head||null,s.latest_ci_id||null,s.latest_ci_conclusion||null,s.last_pushed_at||null]);
}
export async function startRun(db,id,kind='scheduled'){
 runId(id);if(!['scheduled','supervised'].includes(kind))throw Error('Invalid run kind');
 const x=await db.prepare("INSERT OR IGNORE INTO refresh_runs (run_id,kind,status) VALUES (?,?,'running')").bind(id,kind).run();
 return {started:x.meta?.changes===1};
}
export async function finishRun(db,id,{status,checked=0,changed=0,discovered=0,focusChanged=0,note=null}){
 runId(id);if(!['succeeded','partial','failed'].includes(status))throw Error('Invalid result');
 for(const x of [checked,changed,discovered,focusChanged])if(!Number.isInteger(x)||x<0||x>10000)throw Error('Invalid counter');
 const q=await db.prepare("UPDATE refresh_runs SET status=?,finished_at=CURRENT_TIMESTAMP,checked_count=?,changed_count=?,discovered_count=?,focus_changed_count=?,evidence_note=? WHERE run_id=? AND status='running'").bind(status,checked,changed,discovered,focusChanged,note===null?null:text(note,500),id).run();
 return {recorded:q.meta?.changes===1};
}
export async function observe(db,s){
 const fingerprint=observationFingerprint(s),expected=rev(s.expected_revision),run=runId(s.run_id);
 const prior=await db.prepare('SELECT revision,fingerprint FROM source_observations WHERE repo_url=?').bind(s.repo_url).first();
 if((prior?.revision??0)!==expected)return {status:'conflict'};
 const sql='INSERT INTO source_observations (repo_url,fingerprint,source_url,default_branch,main_sha,latest_pr_number,latest_pr_head,latest_ci_id,latest_ci_conclusion,last_pushed_at,refresh_run_id,revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(repo_url) DO UPDATE SET fingerprint=excluded.fingerprint,source_url=excluded.source_url,default_branch=excluded.default_branch,main_sha=excluded.main_sha,latest_pr_number=excluded.latest_pr_number,latest_pr_head=excluded.latest_pr_head,latest_ci_id=excluded.latest_ci_id,latest_ci_conclusion=excluded.latest_ci_conclusion,last_pushed_at=excluded.last_pushed_at,last_checked_at=CURRENT_TIMESTAMP,refresh_run_id=excluded.refresh_run_id,revision=CASE WHEN source_observations.fingerprint=excluded.fingerprint THEN source_observations.revision ELSE source_observations.revision+1 END WHERE source_observations.revision=?';
 const x=await db.prepare(sql).bind(s.repo_url,fingerprint,s.source_url,s.default_branch||null,s.main_sha||null,s.latest_pr_number||null,s.latest_pr_head||null,s.latest_ci_id||null,s.latest_ci_conclusion||null,s.last_pushed_at||null,run,expected).run();
 return x.meta?.changes!==1?{status:'conflict'}:{status:!prior?'new':prior.fingerprint===fingerprint?'unchanged':'changed',revision:prior?.fingerprint===fingerprint?expected:expected+1};
}
export async function reviseReview(db,s){
 rev(s.expected_revision);runId(s.run_id);
 if(!githubEvidence(s.evidence_url,s.repo_url))throw Error('Evidence cannot verify repository');
 if(!['high','medium','low'].includes(s.confidence)||!['PR metadata','PR + README','README + metadata','Repository metadata'].includes(s.evidence_depth))throw Error('Invalid evidence quality');
 const sql='UPDATE project_reviews SET category=?,stage=?,summary=?,blocker=?,recommendation=?,evidence_url=?,confidence=?,evidence_depth=?,source_checked_at=CURRENT_TIMESTAMP,assessed_at=CURRENT_TIMESTAMP,refresh_version=refresh_version+1,refresh_run_id=? WHERE repo_url=? AND refresh_version=?';
 const x=await db.prepare(sql).bind(text(s.category,100),text(s.stage,180),text(s.summary),s.blocker==null?null:text(s.blocker),text(s.recommendation),s.evidence_url,s.confidence,s.evidence_depth,s.run_id,s.repo_url,s.expected_revision).run();
 return {status:x.meta?.changes===1?'updated':'conflict'};
}
export async function reviseFocus(db,s){
 rev(s.expected_revision);runId(s.run_id);
 if(!Number.isInteger(s.rank)||s.rank<1||s.rank>5||!githubEvidence(s.evidence_url,s.repo_url))throw Error('Invalid focus source');
 if(!['act_now','prepare','waiting'].includes(s.lane)||!['high','medium','low'].includes(s.confidence))throw Error('Invalid focus lane');
 if(s.deadline_date||s.deadline_evidence_url){if(typeof s.deadline_date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(s.deadline_date)||!githubEvidence(s.deadline_evidence_url,s.repo_url))throw Error('No evidenced deadline')}
 if(s.dependency_url||s.dependency_note){if(typeof s.dependency_note!=='string'||!s.dependency_note.trim()||!/^https:\/\/github\.com\/thiepn\/[A-Za-z0-9_.-]+\/pull\/\d+$/.test(s.dependency_url||''))throw Error('Invalid dependency')}
 const sql='UPDATE focus_recommendations SET headline=?,rationale=?,next_action=?,constraint_note=?,dependency_url=?,dependency_note=?,deadline_date=?,deadline_evidence_url=?,evidence_url=?,confidence=?,lane=?,refresh_version=refresh_version+1,refresh_run_id=?,checked_at=CURRENT_TIMESTAMP WHERE rank=? AND repo_url=? AND refresh_version=?';
 const x=await db.prepare(sql).bind(text(s.headline,150),text(s.rationale),text(s.next_action),text(s.constraint_note),s.dependency_url||null,s.dependency_note||null,s.deadline_date||null,s.deadline_evidence_url||null,s.evidence_url,s.confidence,s.lane,s.run_id,s.rank,s.repo_url,s.expected_revision).run();
 return {status:x.meta?.changes===1?'updated':'conflict'};
}
export async function discover(db,repo_url,id){
 if(!ownerRepo(repo_url)||typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))throw Error('Invalid new repository');
 const x=await db.prepare("INSERT OR IGNORE INTO projects (id,title,status,repo_url,version) VALUES (?,?,'planned',?,1)").bind(id,repo_url.split('/').pop(),repo_url).run();
 return {discovered:x.meta?.changes===1};
}
