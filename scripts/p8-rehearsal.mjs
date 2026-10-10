import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {sha256} from '../src/lib/p8-decision.mjs';
import {simulateRollback} from '../src/lib/p8-rollback.mjs';
export const inputs=['package-lock.json','db/schema.sql','db/p1-app.sql','db/p2-progress.sql','db/p3-github.sql','db/p4-recommendations.sql','db/p5-reviews.sql','db/p7-device-receipts.sql','src/lib/p7-release.mjs','src/lib/p8-decision.mjs','src/lib/p8-rollback.mjs','src/components/ReleaseReadinessPanel.tsx','scripts/p8-record-decision.mjs','scripts/p8-rehearsal.mjs','.github/workflows/p8-qualification.yml','docs/16-p8-acceptance.md'];
const fixture={projects:[{id:'synthetic',version:1,next_action:'Before'}],reviews:[{id:'synthetic-review',state:'submitted',wins:'No protected data'}]};
export function makeP8Manifest(head,now,read=readFileSync){
 if(!/^[a-f0-9]{40}$/.test(head)||!Number.isFinite(Date.parse(now)))throw Error('Exact source required');
 return {schema:'control-p8-review-only-v1',source_sha:head,generated_at:now,
 input_hashes:inputs.map(path=>({path,sha256:sha256(read(path))})),
 isolated_rollback:simulateRollback(fixture,{project_id:'synthetic',next_action:'After'}),
 release_authorized:false,deployed:false,human_acceptance:'NOT_COLLECTED',
 physical_devices:'NOT_COLLECTED',real_disposable_supabase:'NOT_COLLECTED',
 operator_signature:'NOT_COLLECTED',
 note:'Source/fixture review only; no real backup, migration, signed operator, or deploy'};
}
export function verifyP8Manifest(m,expectedHead,read=readFileSync){
 if(!m||m.schema!=='control-p8-review-only-v1'||m.source_sha!==expectedHead||
 m.release_authorized!==false||m.deployed!==false||
 m.human_acceptance!=='NOT_COLLECTED'||m.physical_devices!=='NOT_COLLECTED'||
 m.real_disposable_supabase!=='NOT_COLLECTED'||m.operator_signature!=='NOT_COLLECTED'||
 !Array.isArray(m.input_hashes)||m.input_hashes.length!==inputs.length)
 throw Error('P8 evidence identity or nonapproval gate invalid');
 for(let i=0;i<inputs.length;i++){
  const e=m.input_hashes[i];
  if(e.path!==inputs[i]||e.sha256!==sha256(read(e.path)))throw Error('P8 source input digest mismatch');
 }
 if(JSON.stringify(m.isolated_rollback)!==JSON.stringify(simulateRollback(fixture,{project_id:'synthetic',next_action:'After'})))
  throw Error('P8 synthetic rollback mismatch');
 return true;
}
if(process.argv[1]?.endsWith('p8-rehearsal.mjs')){
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!process.env.CONTROL_P8_EXPECTED_HEAD||process.env.CONTROL_P8_EXPECTED_HEAD!==head)
  throw Error('P8 must use exact branch head not a synthetic PR merge SHA');
 const dir='release-evidence/p8';
 if(process.argv[2]==='create'){
  const json=JSON.stringify(makeP8Manifest(head,new Date().toISOString()),null,2)+'\n';
  mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'manifest.json'),json,{mode:0o600});
  writeFileSync(join(dir,'SHA256SUMS'),sha256(Buffer.from(json))+'  manifest.json\n',{mode:0o600});
  console.log('P8 review-only and unsigned evidence created; no production changes');
 }else if(process.argv[2]==='verify'){
  verifyP8Manifest(JSON.parse(readFileSync(join(dir,'manifest.json'),'utf8')),head);
  console.log('P8 exact branch source, 16 inputs and synthetic rollback verified');
 }else throw Error('Expected create or verify');
}
