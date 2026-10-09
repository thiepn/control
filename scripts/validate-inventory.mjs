import fs from 'node:fs';
import path from 'node:path';
export function checkInventory(filename) {
  const doc=JSON.parse(fs.readFileSync(filename,'utf8'));
  const rows=doc.repositories;
  const errors=[];
  if (!Array.isArray(rows) || rows.length!==86) errors.push('expected exactly 86 discovered repositories');
  const names=new Set();const ids=new Set();
  for (const p of rows||[]) {
    if(names.has(p.repository)) errors.push('duplicate repo '+p.repository);
    names.add(p.repository);
    if(ids.has(p.repo_id)) errors.push('duplicate GitHub repository id '+p.repo_id);
    ids.add(p.repo_id);
    if (p.completion_pct!==null || p.deadline!==null || p.portfolio_status!==null || p.priority!==null) errors.push('fabricated state '+p.repository);
    if (p.human_review_required!==true) errors.push('missing review gate '+p.repository);
    if (p.repository_url!==`https://github.com/${p.repository}`) errors.push('malformed repo URL '+p.repository);
    if (p.github_archived!==false) errors.push('unverified archive flag '+p.repository);
  }
  if(rows.filter(r=>r.owner==='thiepn').length!==85) errors.push('expected 85 thiepn repositories');
  if(rows.filter(r=>r.owner==='newmedu').length!==1) errors.push('expected 1 newmedu repository');
  if(rows.filter(r=>r.visibility==='private').length!==4) errors.push('expected four private repositories');
  if(!rows.some(r=>r.owner==='newmedu' && r.repo_id===1410789173)) errors.push('missing confirmed secondary-owner repository');
  if(names.has('thiepn/control')) errors.push('control repository not yet created as of initial snapshot');
  return {valid:errors.length===0,errors,count:rows.length};
}
if(import.meta.url===`file://${process.argv[1]}`) {
  const p=process.argv[2]||'data/private/repository_inventory.json';
  if (!fs.existsSync(p)) {console.log('Private inventory absent in public checkout: SKIP (not a failure)');process.exit(0);}
  const x=checkInventory(p); console.log(x.valid?`PASS: ${x.count} records; no invented project state`:'FAIL: '+x.errors.join('; '));process.exit(x.valid?0:1);
}
