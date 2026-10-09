/** Preview-only conversion of repo snapshot into human review candidates.
 * Refuses to import into the database or infer project status from activity.
 * Output under data/private/ is intentionally gitignored.
 */
import fs from 'node:fs';
import {checkInventory} from './validate-inventory.mjs';
const input='data/private/repository_inventory.json';
const output='data/private/import_candidates.json';
if (!fs.existsSync(input)) { console.error('Missing private repository snapshot; no candidates generated.');process.exitCode=1; }
else {
  const v=checkInventory(input);
  if (!v.valid) {console.error('Inventory invalid: '+v.errors.join('; '));process.exitCode=1;}
  else {
    const doc=JSON.parse(fs.readFileSync(input,'utf8'));
    const records=doc.repositories.map(r=>({
      external_id:r.repo_id, repository:r.repository,
      suggested_kind:r.classification_proposal,
      suggested_group:r.proposed_group,
      known_from_prior_discussion:r.previously_discussed_development===true,
      review_required:true,
      review_decision:null, portfolio_project_id:null,
      project_lifecycle:null, priority:null,completion_pct:null,deadline:null
    }));
    fs.writeFileSync(output,JSON.stringify({source_snapshot:doc.snapshot_date,status:'PENDING_OWNER_REVIEW',candidates:records},null,2)+'\n');
    console.log(`Prepared ${records.length} unapproved candidates at ${output}. No remote writes.`);
  }
}
